import type { ContactForm } from "../screens/AddContactScreen";
import { t } from "../i18n";

export function effectiveIntervalDays(contact: ContactForm, globalThreshold: number): number {
  return contact.reminderIntervalDays ?? globalThreshold;
}

export function intervalStartDate(contact: ContactForm): string | undefined {
  return contact.reminderIntervalStart || contact.lastContactDate;
}

export function isSnoozed(contact: ContactForm, today: Date = new Date()): boolean {
  if (!contact.snoozedUntil) return false;
  const until = new Date(contact.snoozedUntil);
  return !Number.isNaN(until.getTime()) && until.getTime() > today.getTime();
}

export function daysSinceIntervalStart(contact: ContactForm): number {
  const start = intervalStartDate(contact);
  if (!start) return 9999;
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return 9999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

/**
 * Days since the catch-up rhythm started: the interval start or last contact,
 * else the day the person was added (the same anchor the reminder plan and
 * the People filters use). 9999 when there is no date at all.
 */
function daysSinceAnchor(contact: ContactForm): number {
  const own = daysSinceIntervalStart(contact);
  if (own < 9999) return own;
  const added = contact.createdAt ? new Date(contact.createdAt) : null;
  if (!added || Number.isNaN(added.getTime())) return 9999;
  return Math.max(0, Math.floor((Date.now() - added.getTime()) / 86_400_000));
}

export function isDue(contact: ContactForm, globalThreshold: number): boolean {
  if (contact.reminderEnabled === false) return false;
  if (isSnoozed(contact)) return false;
  const days = daysSinceAnchor(contact);
  return days < 9999 && days >= effectiveIntervalDays(contact, globalThreshold);
}

export function neglectScore(contact: ContactForm, globalThreshold: number): number {
  if (contact.reminderEnabled === false) return -1;
  if (isSnoozed(contact)) return -1;
  const interval = effectiveIntervalDays(contact, globalThreshold);
  const days = daysSinceAnchor(contact);
  return days >= 9999 ? 0 : days / Math.max(1, interval);
}

export const INTERVAL_PRESETS = [
  { label: "Haftada 1",   days: 7 },
  { label: "2 haftada 1", days: 14 },
  { label: "Ayda 1",      days: 30 },
  { label: "3 ayda 1",    days: 90 },
] as const;

export function intervalLabel(days: number): string {
  const preset = INTERVAL_PRESETS.find((p) => p.days === days);
  if (preset) return t(preset.label);
  return t("Her {days} günde bir", { days });
}
