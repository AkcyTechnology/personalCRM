import type { ContactForm } from "../screens/AddContactScreen";
import type { UserSettings } from "../data/userSettings";
import { addDays, nextBirthday, parseISODate } from "./dates";
import { t } from "../i18n";
import { effectiveIntervalDays, intervalStartDate, isDue, neglectScore } from "./reminderInterval";

/** Pure planning step for local notifications — no native calls, easy to test. */

export type PlannedNotification =
  | { kind: "followUp"; contactId: string; date: Date; title: string; body: string }
  | { kind: "birthday"; contactId: string; date: Date; title: string; body: string }
  | { kind: "specialDay"; contactId: string; date: Date; title: string; body: string }
  | { kind: "dated"; contactId: string; reminderId: string; date: Date; title: string; body: string }
  | { kind: "smartNudge"; contactId: string; date: Date; title: string; body: string }
  | { kind: "weeklySummary"; weekday: number; hour: number; minute: number; title: string; body: string }
  | { kind: "dailySummary"; hour: number; minute: number; title: string; body: string };

type PlanSettings = Pick<UserSettings, "reachOutThresholdDays" | "notif_birthday" | "notif_followUp" | "notif_weeklySummary" | "notif_smartNudge"> &
  Partial<Pick<UserSettings, "notif_dailySummary" | "notifyHour" | "quietHoursEnabled" | "quietStart" | "quietEnd">>;

/** True when `hour` falls inside the quiet window (which may wrap past midnight). */
export function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Moves an automatic reminder out of quiet hours, to the end of the window. */
export function outOfQuietHours(d: Date, s: PlanSettings): Date {
  if (!s.quietHoursEnabled) return d;
  const start = s.quietStart ?? 22;
  const end = s.quietEnd ?? 8;
  if (!inQuietHours(d.getHours(), start, end)) return d;
  const moved = new Date(d.getFullYear(), d.getMonth(), d.getDate(), end, 0, 0, 0);
  return moved.getTime() <= d.getTime() ? addDays(moved, 1) : moved;
}

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

export function followUpDate(contact: ContactForm, globalThreshold: number, now: Date = new Date(), hour = REMINDER_HOUR): Date | null {
  if (contact.reminderEnabled === false) return null;
  const start = parseISODate(intervalStartDate(contact)) ?? (contact.createdAt ? new Date(contact.createdAt) : null);
  if (!start) return null;
  let due = addDays(start, effectiveIntervalDays(contact, globalThreshold));
  const snooze = contact.snoozedUntil ? new Date(contact.snoozedUntil) : null;
  if (snooze && !Number.isNaN(snooze.getTime()) && snooze > due) due = snooze;
  return atHourNotPast(due, hour, now);
}

export function planReminders(
  contacts: ContactForm[],
  settings: PlanSettings,
  now: Date = new Date()
): PlannedNotification[] {
  const threshold = settings.reachOutThresholdDays || 14;
  const hour = Number.isInteger(settings.notifyHour) ? (settings.notifyHour as number) : REMINDER_HOUR;
  const quiet = (d: Date) => outOfQuietHours(d, settings);
  const dated: PlannedNotification[] = [];

  // Reminders the user created keep the exact time they picked.
  for (const c of contacts) {
    if (!c.id) continue;
    for (const r of c.reminders ?? []) {
      if (r.done) continue;
      const day = parseISODate(r.date);
      const [hh, mm] = r.time.split(":").map(Number);
      if (!day || !Number.isFinite(hh) || !Number.isFinite(mm)) continue;
      const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, 0, 0);
      if (date.getTime() <= now.getTime()) continue;
      dated.push({
        kind: "dated",
        contactId: c.id,
        reminderId: r.id,
        date,
        title: t("Hatırlatma: {name}", { name: firstName(c) }),
        body: r.note || t("{name} için kurduğun hatırlatıcı", { name: firstName(c) }),
      });
    }
  }

  if (settings.notif_birthday) {
    for (const c of contacts) {
      if (!c.id) continue;
      for (const sd of c.specialDays ?? []) {
        const next = nextBirthday(sd.date, now);
        if (!next) continue;
        const date = quiet(new Date(next.getFullYear(), next.getMonth(), next.getDate(), hour, 0, 0, 0));
        if (date.getTime() <= now.getTime()) continue;
        dated.push({
          kind: "specialDay",
          contactId: c.id,
          date,
          title: t("Bugün {name} için özel bir gün: {label}", { name: firstName(c), label: sd.label }),
          body: t("Küçük bir mesaj onu mutlu edebilir."),
        });
      }
    }
  }

  if (settings.notif_followUp) {
    for (const c of contacts) {
      if (!c.id) continue;
      const at = followUpDate(c, threshold, now, hour);
      if (!at) continue;
      const date = quiet(at);
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
      const date = quiet(new Date(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), hour, 0, 0, 0));
      if (date.getTime() > now.getTime()) {
        dated.push({
          kind: "birthday",
          contactId: c.id,
          date,
          title: t("Yarın {name}'in doğum günü 🎂", { name: firstName(c) }),
          body: t("Küçük bir kutlama mesajı onu çok mutlu edebilir."),
        });
      }
      const sameDay = quiet(new Date(bday.getFullYear(), bday.getMonth(), bday.getDate(), Math.min(hour, 9), 0, 0, 0));
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
      date = quiet(date);
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

  if (settings.notif_dailySummary) {
    result.push({
      kind: "dailySummary",
      hour,
      minute: 0,
      title: t("Bugün kime zaman ayırmak istersin?"),
      body: t("Görüşme zamanı gelen kişilere ve yaklaşan özel günlere göz at."),
    });
  }

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
