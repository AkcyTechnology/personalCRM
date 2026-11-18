import type { ContactForm, InteractionType } from "../screens/AddContactScreen";
import { allMoments } from "./engagement";
import { addDays, parseISODate, toISODate } from "./dates";
import { recentWeeks, weekStats } from "./stats";

const OTHER = "Diğer";

/** Date of each person's latest completed catch-up (today or earlier), by contact id. */
function lastDoneByContact(contacts: ContactForm[], now: Date): Map<string, string> {
  const today = toISODate(now);
  const last = new Map<string, string>();
  for (const m of allMoments(contacts)) {
    if (m.date > today) continue; // planned, not done
    const prev = last.get(m.contactId);
    if (!prev || m.date > prev) last.set(m.contactId, m.date);
  }
  return last;
}

export type Recency = { total: number; recent: number; older: number; never: number };

/**
 * Every saved person in exactly one group by their latest completed catch-up:
 * within the last `days` days (today included), before that, or never.
 * Several catch-ups with one person count once; reminders and future-dated
 * entries are ignored.
 */
export function contactRecency(contacts: ContactForm[], now: Date = new Date(), days = 30): Recency {
  const last = lastDoneByContact(contacts, now);
  const cutoff = toISODate(addDays(now, -(days - 1)));
  let recent = 0, older = 0, never = 0;
  for (const c of contacts) {
    const d = c.id ? last.get(c.id) : undefined;
    if (!d) never++;
    else if (d >= cutoff) recent++;
    else older++;
  }
  return { total: contacts.length, recent, older, never };
}

/** Facts for the written analysis on Profile; each is present only when the data supports it. */
export type InsightFacts = {
  trend?: { thisWeek: number; prevAvg: number };
  goal?: { left: number; reached: boolean };
  topGroup?: { group: string; people: number };
  quietGroup?: { group: string; people: number };
  longestGap?: { contact: ContactForm; days: number };
  channel?: { type: InteractionType; count: number; total: number };
};

export function insightFacts(contacts: ContactForm[], weeklyGoal: number, now: Date = new Date(), days = 30): InsightFacts {
  const facts: InsightFacts = {};
  if (contacts.length === 0) return facts;

  // Week trend: this week against the average of the three before it.
  const weeks = recentWeeks(contacts, 4, now);
  if (weeks.some((w) => w.people > 0)) {
    const prev = weeks.slice(0, 3);
    facts.trend = { thisWeek: weeks[3].people, prevAvg: prev.reduce((s, w) => s + w.people, 0) / prev.length };
  }
  const w = weekStats(contacts, weeklyGoal, now);
  facts.goal = { left: Math.max(0, w.goal - w.people), reached: w.reached };

  const last = lastDoneByContact(contacts, now);
  const cutoff = toISODate(addDays(now, -(days - 1)));
  const groupOf = (c: ContactForm) => c.relationship?.trim() || OTHER;

  // Groups: who you met most in the period, and the biggest group nobody in it was met.
  const met = new Map<string, number>();
  const size = new Map<string, number>();
  for (const c of contacts) {
    const g = groupOf(c);
    size.set(g, (size.get(g) ?? 0) + 1);
    const d = c.id ? last.get(c.id) : undefined;
    if (d && d >= cutoff) met.set(g, (met.get(g) ?? 0) + 1);
  }
  if (met.size > 0 && size.size > 1) {
    const [group, people] = [...met.entries()].sort((a, b) => b[1] - a[1])[0];
    facts.topGroup = { group, people };
    const quiet = [...size.entries()].filter(([g]) => !met.has(g)).sort((a, b) => b[1] - a[1])[0];
    if (quiet) facts.quietGroup = { group: quiet[0], people: quiet[1] };
  }

  // The person with the longest gap since a completed catch-up.
  const today = parseISODate(toISODate(now))!.getTime();
  let gap: { contact: ContactForm; days: number } | undefined;
  for (const c of contacts) {
    const d = c.id ? last.get(c.id) : undefined;
    if (!d) continue;
    const n = Math.round((today - parseISODate(d)!.getTime()) / 86_400_000);
    if (!gap || n > gap.days) gap = { contact: c, days: n };
  }
  if (gap && gap.days >= 14) facts.longestGap = gap;

  // Most used channel among logged catch-ups in the period.
  const types = new Map<InteractionType, number>();
  let total = 0;
  for (const m of allMoments(contacts)) {
    if (!m.interaction || m.date < cutoff || m.date > toISODate(now)) continue;
    total++;
    types.set(m.interaction.type, (types.get(m.interaction.type) ?? 0) + 1);
  }
  if (total >= 2) {
    const [type, count] = [...types.entries()].sort((a, b) => b[1] - a[1])[0];
    facts.channel = { type, count, total };
  }
  return facts;
}

/**
 * A number with the Turkish "-(y)le" ending written after an apostrophe, as
 * read aloud: 1’iyle, 2’siyle, 3’üyle, 6’sıyla, 9’uyla, 10’uyla, 40’ıyla.
 */
export function withTr(n: number): string {
  const ONES = ["", "iyle", "siyle", "üyle", "üyle", "iyle", "sıyla", "siyle", "iyle", "uyla"];
  const TENS = ["", "uyla", "siyle", "uyla", "ıyla", "siyle", "ıyla", "iyle", "iyle", "ıyla"];
  const abs = Math.abs(Math.trunc(n));
  let suffix: string;
  if (abs === 0) suffix = "ıyla"; // sıfır
  else if (abs % 10) suffix = ONES[abs % 10];
  else if (abs % 100) suffix = TENS[(abs % 100) / 10];
  else if (abs % 1000) suffix = "üyle"; // yüz
  else if (abs % 1_000_000) suffix = "iyle"; // bin
  else suffix = "uyla"; // milyon
  return `${n}’${suffix}`;
}
