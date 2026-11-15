import type { ContactForm } from "../screens/AddContactScreen";
import { addDays, nextBirthday, parseISODate, toISODate } from "./dates";
import { daysSinceLastContact, lastContactISO } from "./stats";

/**
 * Pure filtering and sorting for the People screen, so the rules can be
 * tested and the screen stays about layout.
 *
 * Quick filters
 * - all:   everyone matching the search and the advanced filters;
 * - due:   a catch-up or a dated reminder is today or already past;
 * - week:  a catch-up, a dated reminder, a birthday or a special day falls in
 *          the 7 days after today.
 *
 * Advanced filters: values inside one group are OR-ed, groups are AND-ed.
 */

export type QuickFilter = "all" | "due" | "week";
export type LastContactBucket = "last7" | "d8to30" | "over30" | "none";
export type ReminderState = "overdue" | "today" | "future" | "none";
export type SortKey = "name" | "lastContact" | "nextReminder" | "newest" | "manual";

export type AdvancedFilters = {
  groups: string[];
  lastContact: LastContactBucket[];
  reminder: ReminderState[];
  tags: string[];
  cities: string[];
  companies: string[];
};

export const EMPTY_FILTERS: AdvancedFilters = { groups: [], lastContact: [], reminder: [], tags: [], cities: [], companies: [] };

export function activeFilterCount(f: AdvancedFilters): number {
  return f.groups.length + f.lastContact.length + f.reminder.length + f.tags.length + f.cities.length + f.companies.length;
}

const day = (d: Date) => toISODate(d);

export function tagsOf(c: ContactForm): string[] {
  return (typeof c.tags === "string" ? c.tags : "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** The day the catch-up rhythm comes round (may be in the past), or null when off. */
export function catchUpDay(c: ContactForm, threshold: number): string | null {
  if (c.reminderEnabled === false) return null;
  const start = parseISODate(c.reminderIntervalStart || c.lastContactDate || "") ?? (c.createdAt ? new Date(c.createdAt) : null);
  if (!start || Number.isNaN(start.getTime())) return null;
  let due = day(addDays(start, c.reminderIntervalDays ?? threshold));
  const snooze = c.snoozedUntil?.slice(0, 10);
  if (snooze && snooze > due) due = snooze;
  return due;
}

/** The earliest open reminder (catch-up or dated), as YYYY-MM-DD; may be past. */
export function nextReminderISO(c: ContactForm, threshold: number): string | null {
  const dates: string[] = [];
  const catchUp = catchUpDay(c, threshold);
  if (catchUp) dates.push(catchUp);
  for (const r of c.reminders ?? []) if (!r.done && parseISODate(r.date)) dates.push(r.date);
  return dates.length ? dates.sort()[0] : null;
}

export function reminderState(c: ContactForm, threshold: number, now: Date = new Date()): ReminderState {
  const next = nextReminderISO(c, threshold);
  if (!next) return "none";
  const today = day(now);
  return next < today ? "overdue" : next === today ? "today" : "future";
}

export function lastContactBucket(c: ContactForm, now: Date = new Date()): LastContactBucket {
  const d = daysSinceLastContact(c, now);
  if (d === null) return "none";
  if (d <= 7) return "last7";
  if (d <= 30) return "d8to30";
  return "over30";
}

/** True when a reminder, birthday or special day falls in the 7 days after today. */
export function inNextWeek(c: ContactForm, threshold: number, now: Date = new Date()): boolean {
  const today = day(now);
  const end = day(addDays(now, 7));
  const within = (iso: string | null) => !!iso && iso > today && iso <= end;
  if (within(nextReminderISO(c, threshold))) return true;
  if ((c.reminders ?? []).some((r) => !r.done && within(r.date))) return true;
  const bday = nextBirthday(c.birthday, now);
  if (bday && within(day(bday))) return true;
  return (c.specialDays ?? []).some((s) => {
    const d = nextBirthday(s.date, now);
    return !!d && within(day(d));
  });
}

export function matchesQuick(c: ContactForm, quick: QuickFilter, threshold: number, now: Date = new Date()): boolean {
  if (quick === "all") return true;
  if (quick === "due") {
    const s = reminderState(c, threshold, now);
    return s === "overdue" || s === "today";
  }
  return inNextWeek(c, threshold, now);
}

export function matchesSearch(c: ContactForm, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("tr-TR");
  if (!q) return true;
  const hay = [c.fullName, c.company, c.city, c.jobTitle, ...tagsOf(c)].join(" ").toLocaleLowerCase("tr-TR");
  return hay.includes(q);
}

export function matchesAdvanced(c: ContactForm, f: AdvancedFilters, threshold: number, now: Date = new Date()): boolean {
  if (f.groups.length && !f.groups.includes(c.relationship)) return false;
  if (f.lastContact.length && !f.lastContact.includes(lastContactBucket(c, now))) return false;
  if (f.reminder.length && !f.reminder.includes(reminderState(c, threshold, now))) return false;
  if (f.tags.length && !tagsOf(c).some((tag) => f.tags.includes(tag))) return false;
  if (f.cities.length && !f.cities.includes((c.city || "").trim())) return false;
  if (f.companies.length && !f.companies.includes((c.company || "").trim())) return false;
  return true;
}

export function sortPeople(list: ContactForm[], key: SortKey, threshold: number): ContactForm[] {
  const byName = (a: ContactForm, b: ContactForm) => a.fullName.localeCompare(b.fullName, "tr");
  const sorted = [...list];
  if (key === "name") return sorted.sort(byName);
  if (key === "manual") return sorted.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (key === "newest") return sorted.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "") || byName(a, b));
  if (key === "lastContact") {
    // Most recent first; people with no record go last.
    return sorted.sort((a, b) => (lastContactISO(b) || "").localeCompare(lastContactISO(a) || "") || byName(a, b));
  }
  // Soonest reminder first; people without one go last.
  const keyOf = (c: ContactForm) => nextReminderISO(c, threshold) ?? "9999-99-99";
  return sorted.sort((a, b) => keyOf(a).localeCompare(keyOf(b)) || byName(a, b));
}

export function filterPeople(
  contacts: ContactForm[],
  opts: { query: string; quick: QuickFilter; filters: AdvancedFilters; sort: SortKey; threshold: number; now?: Date }
): ContactForm[] {
  const now = opts.now ?? new Date();
  const result = contacts.filter(
    (c) => matchesSearch(c, opts.query) && matchesAdvanced(c, opts.filters, opts.threshold, now) && matchesQuick(c, opts.quick, opts.threshold, now)
  );
  return sortPeople(result, opts.sort, opts.threshold);
}

/** Distinct, non-empty values for the filter panel, sorted for Turkish. */
export function distinctValues(contacts: ContactForm[], pick: (c: ContactForm) => string | string[]): string[] {
  const set = new Set<string>();
  for (const c of contacts) {
    const v = pick(c);
    for (const x of Array.isArray(v) ? v : [v]) if (x && x.trim()) set.add(x.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b, "tr"));
}
