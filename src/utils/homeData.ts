import type { ContactForm, Interaction } from "../screens/AddContactScreen";
import { allMoments, weekKey, weeklyStreak, treeState } from "./engagement";
import { addDays, nextBirthday, parseISODate, toISODate } from "./dates";
import { weekStats } from "./stats";
import { locale, t } from "../i18n";

// ── Turkish name endings ─────────────────────────────────────────────────────

const BACK = "aıou";
const FRONT = "eiöü";
const VOWELS = BACK + FRONT;

function lastVowel(word: string): string {
  const w = word.toLocaleLowerCase("tr-TR");
  for (let i = w.length - 1; i >= 0; i--) if (VOWELS.includes(w[i])) return w[i];
  return "e";
}

/**
 * A first name with a Turkish case ending after an apostrophe, following
 * vowel harmony and the buffer "y" after a vowel:
 * dative Berrin’e / Ayşe’ye / Can’a; comitative Berrin’le / Ayşe’yle / Can’la.
 * Other languages get the bare name (their templates put the word elsewhere).
 */
export function trName(name: string, kind: "dative" | "with"): string {
  if (!locale().startsWith("tr") || !name) return name;
  const back = BACK.includes(lastVowel(name));
  const endsVowel = VOWELS.includes(name.toLocaleLowerCase("tr-TR").slice(-1));
  const y = endsVowel ? "y" : "";
  if (kind === "dative") return `${name}’${y}${back ? "a" : "e"}`;
  return `${name}’${y}${back ? "la" : "le"}`;
}

export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

// ── Relative time ────────────────────────────────────────────────────────────

/** "Bugün", "Dün", "3 gün önce", "2 hafta önce", "5 ay önce", "1 yıl önce". */
export function agoLabel(iso: string, now: Date = new Date()): string {
  const d = parseISODate(iso.slice(0, 10));
  if (!d) return "";
  const today = parseISODate(toISODate(now))!;
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) return t("Bugün");
  if (days === 1) return t("Dün");
  if (days < 7) return t("{count} gün önce", { count: days });
  if (days < 30) return t("{count} hafta önce", { count: Math.floor(days / 7) });
  if (days < 365) return t("{count} ay önce", { count: Math.floor(days / 30) });
  return t("{count} yıl önce", { count: Math.floor(days / 365) });
}

// ── Recent moments ───────────────────────────────────────────────────────────

export type RecentMoment = { contact: ContactForm; date: string; interaction?: Interaction };

/** Completed catch-ups (today or earlier), newest first. */
export function recentMoments(contacts: ContactForm[], limit = 5, now: Date = new Date()): RecentMoment[] {
  const byId = new Map(contacts.filter((c) => c.id).map((c) => [c.id!, c]));
  const today = toISODate(now);
  return allMoments(contacts)
    .filter((m) => m.date <= today && byId.has(m.contactId))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.interaction?.id ?? "").localeCompare(a.interaction?.id ?? ""))
    .slice(0, limit)
    .map((m) => ({ contact: byId.get(m.contactId)!, date: m.date, interaction: m.interaction }));
}

// ── This week ────────────────────────────────────────────────────────────────

export type WeekDay = { iso: string; date: Date; isToday: boolean; isPast: boolean };

/** Monday to Sunday of the current week, local time. */
export function currentWeek(now: Date = new Date()): WeekDay[] {
  const start = parseISODate(weekKey(now))!;
  const today = toISODate(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const iso = toISODate(date);
    return { iso, date, isToday: iso === today, isPast: iso < today };
  });
}

/** Today and the six days after it: the window for upcoming plans. */
export function nextDays(now: Date = new Date(), count = 7): WeekDay[] {
  const start = parseISODate(toISODate(now))!;
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(start, i);
    return { iso: toISODate(date), date, isToday: i === 0, isPast: false };
  });
}

/** Different people met on each day of the current week (Mon…Sun). */
export function dailyPeople(contacts: ContactForm[], now: Date = new Date()): number[] {
  const days = currentWeek(now).map((d) => d.iso);
  const sets = days.map(() => new Set<string>());
  for (const m of allMoments(contacts)) {
    const i = days.indexOf(m.date);
    if (i >= 0) sets[i].add(m.contactId);
  }
  return sets.map((s) => s.size);
}

export type Plan = { contact: ContactForm; date: string; kind: "reminder" | "birthday"; note?: string; time?: string };

/**
 * Things you planned for the next seven days (today included): open dated
 * reminders and birthdays. Follow-up suggestions are not plans.
 */
export function weekPlans(contacts: ContactForm[], now: Date = new Date()): Plan[] {
  const week = nextDays(now);
  const first = week[0].iso, last = week[6].iso;
  const out: Plan[] = [];
  for (const c of contacts) {
    for (const r of c.reminders ?? []) {
      if (!r.done && r.date >= first && r.date <= last) out.push({ contact: c, date: r.date, kind: "reminder", note: r.note, time: r.time });
    }
    const b = nextBirthday(c.birthday, week[0].date);
    if (b) {
      const iso = toISODate(b);
      if (iso <= last) out.push({ contact: c, date: iso, kind: "birthday" });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

// ── Badges ───────────────────────────────────────────────────────────────────

export type Badge = {
  id: string;
  /** i18n keys */
  title: string;
  goal: string;
  icon: string;
  earned: boolean;
  /** 0…1 toward earning it. */
  progress: number;
  /** "3 / 10" style, already formatted. */
  status: string;
};

/** Small milestones from real data only; never awarded for a reminder or a plan. */
export function badges(contacts: ContactForm[], weeklyGoal: number, now: Date = new Date()): Badge[] {
  const moments = allMoments(contacts).filter((m) => m.date <= toISODate(now));
  const people = contacts.length;
  const streak = weeklyStreak(contacts, now);
  const tree = treeState(contacts, now);
  const first = moments.map((m) => m.date).sort()[0];
  const daysSinceFirst = first ? Math.round((parseISODate(toISODate(now))!.getTime() - parseISODate(first)!.getTime()) / 86_400_000) : 0;
  // Goal reached in any of the last 12 weeks.
  const goalHit = Array.from({ length: 12 }, (_, i) => weekStats(contacts, weeklyGoal, addDays(now, -7 * i)).reached).some(Boolean);
  const ratio = (n: number, of: number) => Math.max(0, Math.min(1, n / of));
  const b = (id: string, title: string, goal: string, icon: string, n: number, of: number): Badge => ({
    id, title, goal, icon, earned: n >= of, progress: ratio(n, of), status: `${Math.min(n, of)} / ${of}`,
  });
  return [
    b("seed", "Tohum", "İlk görüşme", "leaf-outline", moments.length, 1),
    b("streak", "Seri", "3 hafta", "flame-outline", Math.max(streak.best, streak.current), 3),
    { ...b("goal", "Hedef", "Haftalık hedef", "flag-outline", goalHit ? 1 : 0, 1), status: goalHit ? "1 / 1" : "0 / 1" },
    b("social", "Sosyal", "10 kişi", "people-outline", people, 10),
    b("loyal", "Sadık", "30 gün", "heart-outline", moments.length ? daysSinceFirst : 0, 30),
    b("tree", "Ağaç", "Fidan aşaması", "git-branch-outline", tree.stage, 2),
  ];
}
