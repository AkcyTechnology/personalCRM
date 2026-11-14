import type { ContactForm } from "../screens/AddContactScreen";
import { allMoments, weekKey } from "./engagement";
import { addDays, parseISODate, toISODate } from "./dates";
import { followUpDate } from "./reminderPlan";
import { isDue, isSnoozed, neglectScore } from "./reminderInterval";

/**
 * One source for the numbers Home, Profile and Insights show, so they can't
 * disagree. Definitions:
 * - week: Monday 00:00 to Sunday 23:59 in the phone's time zone;
 * - a "moment" (görüşme) is a logged interaction or a "last talked" date the
 *   user entered — notes on a contact are never counted;
 * - weekly progress counts distinct people with a moment this week, against
 *   the weekly goal from settings.
 */

export type WeekStats = {
  start: Date;
  end: Date;
  /** Distinct people with a moment this week. */
  people: number;
  /** All moments this week (one person can have several). */
  moments: number;
  goal: number;
  reached: boolean;
};

export function weekStats(contacts: ContactForm[], goal: number, now: Date = new Date()): WeekStats {
  const startKey = weekKey(now);
  const start = parseISODate(startKey)!;
  const end = new Date(addDays(start, 6).getTime() + 86_400_000 - 1);
  const endKey = toISODate(addDays(start, 6));
  const inWeek = allMoments(contacts).filter((m) => m.date >= startKey && m.date <= endKey);
  const people = new Set(inWeek.map((m) => m.contactId)).size;
  const safeGoal = Math.max(1, goal || 3);
  return { start, end, people, moments: inWeek.length, goal: safeGoal, reached: people >= safeGoal };
}

/** Most recent recorded contact date, or null when nothing was recorded. */
export function lastContactISO(c: ContactForm): string | null {
  let best = c.lastContactDate || "";
  for (const i of c.interactions ?? []) if (i.date > best) best = i.date;
  return best && parseISODate(best) ? best : null;
}

/** Whole days since the last recorded contact, or null when unknown. */
export function daysSinceLastContact(c: ContactForm, now: Date = new Date()): number | null {
  const iso = lastContactISO(c);
  if (!iso) return null;
  const d = parseISODate(iso)!;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86_400_000));
}

/** People whose catch-up interval has passed, most overdue first. */
export function dueContacts(contacts: ContactForm[], threshold: number): ContactForm[] {
  return contacts.filter((c) => isDue(c, threshold)).sort((a, b) => neglectScore(b, threshold) - neglectScore(a, threshold));
}

/** People whose next catch-up falls within `days` (not yet due), soonest first. */
export function upcomingContacts(contacts: ContactForm[], threshold: number, days = 7, now: Date = new Date()): { contact: ContactForm; inDays: number }[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return contacts
    .filter((c) => !isDue(c, threshold) && !isSnoozed(c, now))
    .map((c) => {
      const d = followUpDate(c, threshold, now);
      return d ? { contact: c, inDays: Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today) / 86_400_000) } : null;
    })
    .filter((x): x is { contact: ContactForm; inDays: number } => !!x && x.inDays >= 0 && x.inDays <= days)
    .sort((a, b) => a.inDays - b.inDays);
}

/** True when at least one person has a recorded contact date. */
export function hasAnyHistory(contacts: ContactForm[]): boolean {
  return contacts.some((c) => lastContactISO(c) !== null);
}
