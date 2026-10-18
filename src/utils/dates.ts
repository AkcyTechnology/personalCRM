import { locale } from "../i18n";

/** Local-calendar date as YYYY-MM-DD (toISOString would shift it to UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parses YYYY-MM-DD as a local date. */
export function parseISODate(value: string | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Birthdays are stored as DD/MM/YYYY. */
export function parseBirthday(value: string | undefined): { day: number; month: number; year?: number } | null {
  if (!value) return null;
  // Bounded quantifiers, no nesting: linear-time, not a ReDoS risk.
  // eslint-disable-next-line security/detect-unsafe-regex
  const m = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?$/.exec(value.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month, year: m[3] ? Number(m[3]) : undefined };
}

export function formatBirthday(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function birthdayToDate(value: string | undefined): Date | null {
  const b = parseBirthday(value);
  if (!b) return null;
  return new Date(b.year ?? 2000, b.month - 1, b.day);
}

/** Next occurrence of a birthday (today counts), at local midnight. */
export function nextBirthday(value: string | undefined, now: Date = new Date()): Date | null {
  const b = parseBirthday(value);
  if (!b) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), b.month - 1, b.day);
  if (next < today) next = new Date(today.getFullYear() + 1, b.month - 1, b.day);
  return next;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** "17 Ekim 2026" / "October 17, 2026" in the app language. */
export function formatLongTR(d: Date): string {
  return d.toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
}
