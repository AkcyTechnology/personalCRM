import type { ContactForm, Interaction } from "../screens/AddContactScreen";
import { addDays, nextBirthday, parseISODate, toISODate } from "./dates";
import { daysSinceIntervalStart, isSnoozed, neglectScore } from "./reminderInterval";

/**
 * Engagement features computed purely from the user's own recorded moments —
 * nothing extra is stored, so streaks and sparks can never drift from the data.
 */

// ── Weeks ─────────────────────────────────────────────────────────────────────

/** Monday (local) of the week containing `d`, as YYYY-MM-DD. */
export function weekKey(d: Date): string {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (day.getDay() + 6) % 7; // Monday = 0
  return toISODate(addDays(day, -offset));
}

type Moment = { contactId: string; date: string; interaction?: Interaction };

/** Every recorded moment (interaction history + manually set last-contact dates). */
export function allMoments(contacts: ContactForm[]): Moment[] {
  const out: Moment[] = [];
  for (const c of contacts) {
    if (!c.id) continue;
    const dates = new Set<string>();
    for (const i of c.interactions ?? []) {
      dates.add(i.date);
      out.push({ contactId: c.id, date: i.date, interaction: i });
    }
    if (c.lastContactDate && !dates.has(c.lastContactDate)) out.push({ contactId: c.id, date: c.lastContactDate });
  }
  return out.filter((m) => !!parseISODate(m.date));
}

export type Streak = {
  /** Consecutive weeks with at least one moment (frozen weeks keep it alive). */
  current: number;
  best: number;
  /** Freezes left; one is earned every 4 active weeks (max 2). */
  freezes: number;
  thisWeekDone: boolean;
};

export function weeklyStreak(contacts: ContactForm[], now: Date = new Date()): Streak {
  const active = new Set(allMoments(contacts).map((m) => weekKey(parseISODate(m.date)!)));
  const thisWeek = weekKey(now);
  if (active.size === 0) return { current: 0, best: 0, freezes: 0, thisWeekDone: false };

  const first = [...active].sort()[0];
  let streak = 0, best = 0, freezes = 0;
  for (let w = parseISODate(first)!; toISODate(w) <= thisWeek; w = addDays(w, 7)) {
    const key = toISODate(w);
    if (active.has(key)) {
      streak += 1;
      if (streak % 4 === 0) freezes = Math.min(2, freezes + 1);
    } else if (key === thisWeek) {
      // Hafta henüz bitmedi: seri bozulmaz.
    } else if (streak > 0 && freezes > 0) {
      freezes -= 1; // dondurma hakkı bu haftayı kurtardı
    } else {
      streak = 0;
    }
    best = Math.max(best, streak);
  }
  return { current: streak, best, freezes, thisWeekDone: active.has(thisWeek) };
}

/** Distinct people with a moment in the current week. */
export function peopleThisWeek(contacts: ContactForm[], now: Date = new Date()): number {
  const wk = weekKey(now);
  return new Set(allMoments(contacts).filter((m) => weekKey(parseISODate(m.date)!) === wk).map((m) => m.contactId)).size;
}

// ── Person of the day ─────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export type PickReason =
  | { kind: "birthday"; days: number }
  | { kind: "longTime"; days: number }
  | { kind: "noted" }
  | { kind: "newConnection" }
  | { kind: "justBecause" };

export function reasonFor(c: ContactForm, now: Date = new Date()): PickReason {
  const bday = nextBirthday(c.birthday, now);
  if (bday) {
    const days = Math.round((bday.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
    if (days <= 7) return { kind: "birthday", days };
  }
  const since = daysSinceIntervalStart(c);
  if (since < 9999 && since >= 21) return { kind: "longTime", days: since };
  if ((c.interactions ?? []).some((i) => i.note)) return { kind: "noted" };
  if (!c.lastContactDate) return { kind: "newConnection" };
  return { kind: "justBecause" };
}

/** Candidates for reaching out, most-missed first (snoozed / muted excluded). */
export function reachOutCandidates(contacts: ContactForm[], threshold: number): ContactForm[] {
  return contacts
    .filter((c) => c.id && c.reminderEnabled !== false && !isSnoozed(c))
    .sort((a, b) => neglectScore(b, threshold) - neglectScore(a, threshold));
}

/** Stable for the whole day, rotates daily among the people you might miss most. */
export function personOfTheDay(contacts: ContactForm[], threshold: number, now: Date = new Date()): ContactForm | null {
  const pool = reachOutCandidates(contacts, threshold).slice(0, 5);
  if (pool.length === 0) return null;
  return pool[hash(toISODate(now)) % pool.length];
}

// ── Today's sparks ────────────────────────────────────────────────────────────

export type Spark =
  | { id: string; kind: "reconnect"; contact: ContactForm; days: number; done: boolean }
  | { id: string; kind: "birthday"; contact: ContactForm; days: number; done: boolean }
  | { id: string; kind: "followUp"; contact: ContactForm; note: string; done: boolean }
  | { id: string; kind: "meetUp"; done: boolean };

function contactedOn(c: ContactForm, day: string) {
  return c.lastContactDate === day || (c.interactions ?? []).some((i) => i.date === day);
}

/** Up to three small, personal actions for today; done when a moment is logged today. */
export function todaysSparks(contacts: ContactForm[], threshold: number, now: Date = new Date()): Spark[] {
  const today = toISODate(now);
  const used = new Set<string>();
  const sparks: Spark[] = [];

  const reconnect = reachOutCandidates(contacts, threshold).find(
    (c) => daysSinceIntervalStart(c) >= 60 && daysSinceIntervalStart(c) < 9999
  );
  if (reconnect?.id) {
    used.add(reconnect.id);
    sparks.push({ id: `r-${reconnect.id}`, kind: "reconnect", contact: reconnect, days: daysSinceIntervalStart(reconnect), done: contactedOn(reconnect, today) });
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const bday = contacts
    .filter((c) => c.id && !used.has(c.id))
    .map((c) => ({ c, d: nextBirthday(c.birthday, now) }))
    .filter((x): x is { c: ContactForm; d: Date } => !!x.d)
    .map((x) => ({ ...x, days: Math.round((x.d.getTime() - startOfToday) / 86_400_000) }))
    .filter((x) => x.days <= 7)
    .sort((a, b) => a.days - b.days)[0];
  if (bday) {
    used.add(bday.c.id!);
    sparks.push({ id: `b-${bday.c.id}`, kind: "birthday", contact: bday.c, days: bday.days, done: contactedOn(bday.c, today) });
  }

  const cutoff = toISODate(addDays(now, -14));
  const follow = contacts
    .filter((c) => c.id && !used.has(c.id))
    .map((c) => ({ c, i: (c.interactions ?? []).filter((x) => x.note && x.date >= cutoff && x.date < today).sort((a, b) => b.date.localeCompare(a.date))[0] }))
    .filter((x) => !!x.i)
    .sort((a, b) => b.i!.date.localeCompare(a.i!.date))[0];
  if (follow?.i) {
    used.add(follow.c.id!);
    sparks.push({ id: `f-${follow.c.id}`, kind: "followUp", contact: follow.c, note: follow.i.note!, done: contactedOn(follow.c, today) });
  }

  if (sparks.length < 3) {
    const met = contacts.some((c) => (c.interactions ?? []).some((i) => i.date === today && i.type === "meeting"));
    sparks.push({ id: "meet", kind: "meetUp", done: met });
  }

  // Ek kişi önerileriyle üçe tamamla
  for (const c of reachOutCandidates(contacts, threshold)) {
    if (sparks.length >= 3) break;
    if (!c.id || used.has(c.id)) continue;
    used.add(c.id);
    const days = daysSinceIntervalStart(c);
    sparks.push({ id: `r-${c.id}`, kind: "reconnect", contact: c, days: days < 9999 ? days : 0, done: contactedOn(c, today) });
  }
  return sparks.slice(0, 3);
}

// ── On this day ───────────────────────────────────────────────────────────────

export type Memory = { contact: ContactForm; yearsAgo: number; kind: "moment" | "added"; interaction?: Interaction };

/** "1 yıl önce bugün…" — moments and first-added dates that share today's date. */
export function onThisDay(contacts: ContactForm[], now: Date = new Date()): Memory[] {
  const md = toISODate(now).slice(5);
  const year = now.getFullYear();
  const out: Memory[] = [];
  for (const c of contacts) {
    for (const i of c.interactions ?? []) {
      const y = Number(i.date.slice(0, 4));
      if (i.date.slice(5) === md && y < year) out.push({ contact: c, yearsAgo: year - y, kind: "moment", interaction: i });
    }
    if (c.createdAt) {
      const created = new Date(c.createdAt);
      const iso = toISODate(created);
      if (iso.slice(5) === md && created.getFullYear() < year) out.push({ contact: c, yearsAgo: year - created.getFullYear(), kind: "added" });
    }
  }
  return out.sort((a, b) => b.yearsAgo - a.yearsAgo).slice(0, 3);
}

// ── Monthly story ("Wrapped") ─────────────────────────────────────────────────

export type MonthlyStory = {
  monthKey: string; // YYYY-MM
  people: number;
  moments: number;
  reconnected: number;
  newPeople: number;
  topCircle?: string;
  topPerson?: ContactForm;
  inPerson: number;
};

export function monthlyStory(contacts: ContactForm[], now: Date = new Date()): MonthlyStory {
  const monthKey = toISODate(now).slice(0, 7);
  const byPerson = new Map<string, number>();
  const circles = new Map<string, number>();
  let moments = 0, reconnected = 0, inPerson = 0;

  for (const c of contacts) {
    const list = [...(c.interactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    list.forEach((i, idx) => {
      if (!i.date.startsWith(monthKey)) return;
      moments += 1;
      if (i.type === "meeting") inPerson += 1;
      byPerson.set(c.id!, (byPerson.get(c.id!) ?? 0) + 1);
      if (c.relationship) circles.set(c.relationship, (circles.get(c.relationship) ?? 0) + 1);
      const prev = list[idx - 1]?.date;
      const prevDate = prev ? parseISODate(prev) : null;
      const cur = parseISODate(i.date)!;
      if (prevDate && (cur.getTime() - prevDate.getTime()) / 86_400_000 >= 90) reconnected += 1;
    });
  }
  const topId = [...byPerson.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    monthKey,
    people: byPerson.size,
    moments,
    reconnected,
    newPeople: contacts.filter((c) => c.createdAt?.startsWith(monthKey)).length,
    topCircle: [...circles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
    topPerson: contacts.find((c) => c.id === topId),
    inPerson,
  };
}

// ── Relationship journey ──────────────────────────────────────────────────────

export type Journey = { since?: string; moments: number; longestGapDays: number; averageGapDays?: number };

export function relationshipJourney(c: ContactForm): Journey {
  const dates = [...new Set([...(c.interactions ?? []).map((i) => i.date), c.lastContactDate].filter(Boolean) as string[])].sort();
  const since = [c.createdAt ? toISODate(new Date(c.createdAt)) : undefined, dates[0]].filter(Boolean).sort()[0];
  let longest = 0, total = 0;
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((parseISODate(dates[i])!.getTime() - parseISODate(dates[i - 1])!.getTime()) / 86_400_000);
    longest = Math.max(longest, gap);
    total += gap;
  }
  return {
    since,
    moments: (c.interactions ?? []).length,
    longestGapDays: longest,
    averageGapDays: dates.length > 1 ? Math.round(total / (dates.length - 1)) : undefined,
  };
}


// ── Bond tree ─────────────────────────────────────────────────────────────────

/** Stage thresholds in total moments. Early stages come fast so the first week feels alive. */
export const TREE_STAGES = [
  { at: 0, name: "Tohum" },
  { at: 1, name: "Filiz" },
  { at: 3, name: "Fidan" },
  { at: 10, name: "Genç ağaç" },
  { at: 25, name: "Ağaç" },
  { at: 50, name: "Çiçek açan ağaç" },
] as const;

export type TreeVitality = "resting" | "growing" | "thriving";

export type TreeState = {
  /** 0…5, index into TREE_STAGES. Never goes down: the tree can rest but not die. */
  stage: number;
  moments: number;
  /** Moments still needed for the next stage (0 at the last stage). */
  toNext: number;
  /** 0…1 progress inside the current stage. */
  progress: number;
  /** One leaf per moment, capped so the drawing stays readable. */
  leaves: number;
  /** One blossom per person you connected with this week. */
  blossoms: number;
  vitality: TreeVitality;
};

export function treeState(contacts: ContactForm[], now: Date = new Date()): TreeState {
  const moments = allMoments(contacts);
  const total = moments.length;
  let stage = 0;
  TREE_STAGES.forEach((s, i) => { if (total >= s.at) stage = i; });
  const cur = TREE_STAGES[stage].at;
  const next = TREE_STAGES[stage + 1]?.at;
  const since = toISODate(addDays(now, -14));
  const recent = moments.filter((m) => m.date >= since && m.date <= toISODate(now)).length;
  return {
    stage,
    moments: total,
    toNext: next === undefined ? 0 : next - total,
    progress: next === undefined ? 1 : (total - cur) / (next - cur),
    leaves: Math.min(total, 60),
    blossoms: Math.min(peopleThisWeek(contacts, now), 7),
    vitality: recent === 0 ? "resting" : recent >= 3 ? "thriving" : "growing",
  };
}
