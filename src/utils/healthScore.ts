import type { ContactForm } from "../screens/AddContactScreen";
import { colors } from "../theme/colors";
import { daysSinceIntervalStart, effectiveIntervalDays, isSnoozed } from "./reminderInterval";

/**
 * 0–100 per contact. Within the chosen interval the score eases from 100 to
 * 60 (still healthy); once overdue it falls from 60 to 0 over two more
 * intervals. A single late contact therefore reads as "needs attention", not
 * as total failure. Snoozed contacts count as on track.
 */
export function healthScore(contact: ContactForm, globalThreshold: number): number {
  const days = daysSinceIntervalStart(contact);
  if (days >= 9999) return 0;
  if (isSnoozed(contact)) return 100;
  const interval = Math.max(1, effectiveIntervalDays(contact, globalThreshold));
  const ratio = days / interval;
  const score = ratio <= 1 ? 100 - 40 * ratio : 60 - 30 * (ratio - 1);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** True when there is a date to measure from (contacts without one are not scored). */
export function isScorable(contact: ContactForm): boolean {
  return contact.reminderEnabled !== false && daysSinceIntervalStart(contact) < 9999;
}

/**
 * Average over contacts that can be scored. Returns 100 when there is
 * nothing to score yet, so a brand-new user does not start at 0.
 */
export function averageHealthScore(contacts: ContactForm[], globalThreshold: number): number {
  const scorable = contacts.filter(isScorable);
  if (scorable.length === 0) return 100;
  const sum = scorable.reduce((acc, c) => acc + healthScore(c, globalThreshold), 0);
  return Math.round(sum / scorable.length);
}

export function healthScoreColor(score: number): string {
  if (score >= 70) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.danger;
}

export function healthScoreLabel(score: number): string {
  if (score >= 70) return "İyi";
  if (score >= 40) return "Dikkat";
  return "Zayıf";
}
