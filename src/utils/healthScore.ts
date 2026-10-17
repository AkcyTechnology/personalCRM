import type { ContactForm } from "../screens/AddContactScreen";
import { colors } from "../theme/colors";
import { daysSinceIntervalStart, effectiveIntervalDays } from "./reminderInterval";

export function healthScore(contact: ContactForm, globalThreshold: number): number {
  const days = daysSinceIntervalStart(contact);
  if (days >= 9999) return 0;
  const interval = effectiveIntervalDays(contact, globalThreshold);
  return Math.max(0, Math.min(100, Math.round(100 - (days / Math.max(1, interval)) * 100)));
}

export function averageHealthScore(contacts: ContactForm[], globalThreshold: number): number {
  if (contacts.length === 0) return 0;
  const sum = contacts.reduce((acc, c) => acc + healthScore(c, globalThreshold), 0);
  return Math.round(sum / contacts.length);
}

export function healthScoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
}
