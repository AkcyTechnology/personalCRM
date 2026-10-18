import type { ContactForm } from "../screens/AddContactScreen";
import type { UserSettings } from "../data/userSettings";
import { addDays, nextBirthday, parseISODate } from "./dates";
import { t } from "../i18n";
import { effectiveIntervalDays, intervalStartDate, isDue, neglectScore } from "./reminderInterval";

/** Pure planning step for local notifications — no native calls, easy to test. */

export type PlannedNotification =
  | { kind: "followUp"; contactId: string; date: Date; title: string; body: string }
  | { kind: "birthday"; contactId: string; date: Date; title: string; body: string }
  | { kind: "smartNudge"; contactId: string; date: Date; title: string; body: string }
  | { kind: "weeklySummary"; weekday: number; hour: number; minute: number; title: string; body: string };

export const REMINDER_HOUR = 10;
const NUDGE_HOUR = 18;
/** iOS keeps at most 64 pending local notifications per app. */
const MAX_DATED = 56;

function firstName(c: ContactForm) {
  return c.fullName.trim().split(/\s+/)[0] || c.fullName;
}

/** The given day at `hour`, or the next day if that moment already passed. */
function atHourNotPast(day: Date, hour: number, now: Date): Date {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
  if (d.getTime() <= now.getTime()) {
    const t = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), hour, 0, 0, 0);
  }
  return d;
}

export function followUpDate(contact: ContactForm, globalThreshold: number, now: Date = new Date()): Date | null {
  if (contact.reminderEnabled === false) return null;
  const start = parseISODate(intervalStartDate(contact)) ?? (contact.createdAt ? new Date(contact.createdAt) : null);
  if (!start) return null;
  let due = addDays(start, effectiveIntervalDays(contact, globalThreshold));
  const snooze = contact.snoozedUntil ? new Date(contact.snoozedUntil) : null;
  if (snooze && !Number.isNaN(snooze.getTime()) && snooze > due) due = snooze;
  return atHourNotPast(due, REMINDER_HOUR, now);
}

export function planReminders(
  contacts: ContactForm[],
  settings: Pick<UserSettings, "reachOutThresholdDays" | "notif_birthday" | "notif_followUp" | "notif_weeklySummary" | "notif_smartNudge">,
  now: Date = new Date()
): PlannedNotification[] {
  const threshold = settings.reachOutThresholdDays || 14;
  const dated: PlannedNotification[] = [];

  if (settings.notif_followUp) {
    for (const c of contacts) {
      if (!c.id) continue;
      const date = followUpDate(c, threshold, now);
      if (!date) continue;
      dated.push({
        kind: "followUp",
        contactId: c.id,
        date,
        title: t("Küçük bir merhaba çok şey değiştirebilir"),
        body: t("{name} ile görüşmeyeli epey oldu. Bir selam vermek ister misin?", { name: firstName(c) }),
      });
    }
  }

  if (settings.notif_birthday) {
    for (const c of contacts) {
      if (!c.id) continue;
      const bday = nextBirthday(c.birthday, now);
      if (!bday) continue;
      const dayBefore = addDays(bday, -1);
      const date = new Date(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), REMINDER_HOUR, 0, 0, 0);
      if (date.getTime() > now.getTime()) {
        dated.push({
          kind: "birthday",
          contactId: c.id,
          date,
          title: t("Yarın {name}'in doğum günü 🎂", { name: firstName(c) }),
          body: t("Küçük bir kutlama mesajı onu çok mutlu edebilir."),
        });
      }
      const sameDay = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate(), 9, 0, 0, 0);
      if (sameDay.getTime() > now.getTime()) {
        dated.push({
          kind: "birthday",
          contactId: c.id,
          date: sameDay,
          title: t("Bugün {name}'in doğum günü 🎉", { name: firstName(c) }),
          body: t("Onu kutlamak için harika bir gün."),
        });
      }
    }
  }

  if (settings.notif_smartNudge) {
    const candidate = contacts
      .filter((c) => c.id && isDue(c, threshold))
      .sort((a, b) => neglectScore(b, threshold) - neglectScore(a, threshold))[0];
    if (candidate?.id) {
      // Bir sonraki perşembe akşamı — hafta ortası en çok cevap alınan an.
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const offset = (4 - today.getDay() + 7) % 7;
      let date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, NUDGE_HOUR, 0, 0, 0);
      if (date.getTime() <= now.getTime()) date = addDays(date, 7);
      dated.push({
        kind: "smartNudge",
        contactId: candidate.id,
        date,
        title: t("Bu akşam için küçük bir öneri"),
        body: t("{name} aklına geldi mi? Bir “nasılsın?” bazen her şeye yeter.", { name: firstName(candidate) }),
      });
    }
  }

  dated.sort((a, b) => (a as { date: Date }).date.getTime() - (b as { date: Date }).date.getTime());
  const result: PlannedNotification[] = dated.slice(0, MAX_DATED);

  if (settings.notif_weeklySummary) {
    const dueCount = contacts.filter((c) => isDue(c, threshold)).length;
    result.push({
      kind: "weeklySummary",
      weekday: 2, // Pazartesi (1 = Pazar)
      hour: 9,
      minute: 0,
      title: t("Yeni bir hafta, yeni anlar"),
      body:
        dueCount > 0
          ? t("Bu hafta görüşmek isteyebileceğin birkaç kişi var.")
          : t("Harika gidiyorsun! Bu haftaya güzel bir merhaba ile başla."),
    });
  }

  return result;
}
