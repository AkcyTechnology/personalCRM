import type { ContactForm } from "../screens/AddContactScreen";
import { colors } from "../theme/colors";
import { daysSinceIntervalStart, effectiveIntervalDays, isSnoozed } from "./reminderInterval";

/**
 * "Connection status" is a follow-up indicator, not a measure of how good a
 * relationship is: it only says how up to date the user's own records are
 * against the catch-up rhythm they chose.
 *
 * Per contact (0–100): within the chosen interval it eases from 100 to 60;
 * once overdue it falls from 60 to 0 over two more intervals. Snoozed contacts
 * count as on track.
 *
 * A contact is only scored when there is a real, user-recorded contact date
 * (a logged moment or a "last talked" date). People imported from the address
 * book have only a reminder start date — scoring them would show a fresh 100
 * that nothing supports.
 */

/** Fewer scored people than this → "not enough data yet" instead of an average. */
export const MIN_SCORED_PEOPLE = 3;

export function hasKnownHistory(contact: ContactForm): boolean {
  return !!contact.lastContactDate || (contact.interactions?.length ?? 0) > 0;
}

/** True when the contact counts towards the overall status. */
export function isScorable(contact: ContactForm): boolean {
  return contact.reminderEnabled !== false && hasKnownHistory(contact);
}

/** null when there is no recorded contact date to measure from. */
export function healthScore(contact: ContactForm, globalThreshold: number): number | null {
  if (!hasKnownHistory(contact)) return null;
  if (isSnoozed(contact)) return 100;
  const days = daysSinceIntervalStart(contact);
  if (days >= 9999) return null;
  const interval = Math.max(1, effectiveIntervalDays(contact, globalThreshold));
  const ratio = days / interval;
  const score = ratio <= 1 ? 100 - 40 * ratio : 60 - 30 * (ratio - 1);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type ConnectionStatus = {
  /** null until at least MIN_SCORED_PEOPLE people have a recorded contact date. */
  score: number | null;
  scored: number;
  total: number;
};

export function connectionStatus(contacts: ContactForm[], globalThreshold: number): ConnectionStatus {
  const scorable = contacts.filter(isScorable);
  if (scorable.length < MIN_SCORED_PEOPLE) return { score: null, scored: scorable.length, total: contacts.length };
  const sum = scorable.reduce((acc, c) => acc + (healthScore(c, globalThreshold) ?? 0), 0);
  return { score: Math.round(sum / scorable.length), scored: scorable.length, total: contacts.length };
}

/** Average status, or null when there is not enough recorded data yet. */
export function averageHealthScore(contacts: ContactForm[], globalThreshold: number): number | null {
  return connectionStatus(contacts, globalThreshold).score;
}

export function healthScoreColor(score: number | null): string {
  if (score === null) return colors.textMuted;
  if (score >= 70) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.danger;
}

/** A word to go with the colour, so the status is never conveyed by colour alone. */
export function healthScoreLabel(score: number | null): string {
  if (score === null) return "Henüz yeterli veri yok";
  if (score >= 70) return "İyi";
  if (score >= 40) return "Dikkat";
  return "Zayıf";
}

/** Sort key: contacts without data go last. */
export function healthSortKey(contact: ContactForm, globalThreshold: number): number {
  return healthScore(contact, globalThreshold) ?? -1;
}
