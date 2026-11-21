import type { ContactForm, DatedReminder, Interaction, InteractionType, SpecialDay } from "../screens/AddContactScreen";
import type { CardShow, UserSettings } from "./userSettings";
import { isKnownAvatar } from "./avatars";
import { parseBirthday } from "../utils/dates";

/**
 * Turns untrusted data (a backup file someone sent you) into well-typed
 * records. Only known fields are copied, every value is type- and
 * length-checked, and lists are capped, so a crafted file can neither crash
 * the app on every launch nor smuggle in extra fields or settings.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
// Fixed-length groups, no nesting: linear time.
// eslint-disable-next-line security/detect-unsafe-regex
const DAY_MONTH = /^\d{2}\/\d{2}(\/\d{4})?$/;
const ID = /^[A-Za-z0-9_-]{1,100}$/;
const TYPES: InteractionType[] = ["call", "whatsapp", "email", "meeting", "message", "other"];

const LIMITS = { contacts: 10_000, interactions: 5_000, reminders: 200, specialDays: 50, socials: 20, extraPhones: 10 };

export const str = (v: unknown, max = 2000): string => (typeof v === "string" ? v.slice(0, max) : "");
const optStr = (v: unknown, max: number): string | undefined => (typeof v === "string" && v ? v.slice(0, max) : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const realDate = (v: string) => {
  const d = new Date(`${v.slice(0, 10)}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v.slice(0, 10);
};
const isoDate = (v: unknown): string | undefined => (typeof v === "string" && ISO_DATE.test(v) && realDate(v) ? v : undefined);
/** An ISO timestamp (or date) that starts with a real calendar day. */
const isoDateTime = (v: unknown): string | undefined =>
  typeof v === "string" && v.length <= 40 && ISO_DATE.test(v.slice(0, 10)) && realDate(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
const int = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : undefined;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const safeId = (v: unknown): string | undefined => (typeof v === "string" && ID.test(v) ? v : undefined);

let seq = 0;
const freshId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function interactions(v: unknown): Interaction[] {
  const seen = new Set<string>();
  const out: Interaction[] = [];
  for (const raw of arr(v)) {
    if (out.length >= LIMITS.interactions) break;
    const o = obj(raw);
    const date = o && isoDate(o.date);
    if (!o || !date) continue;
    let id = safeId(o.id) ?? freshId("i");
    if (seen.has(id)) id = freshId("i");
    seen.add(id);
    const type = TYPES.includes(o.type as InteractionType) ? (o.type as InteractionType) : "other";
    out.push({ id, date, type, note: optStr(o.note, 5000) });
  }
  return out;
}

function reminders(v: unknown): DatedReminder[] {
  const out: DatedReminder[] = [];
  for (const raw of arr(v)) {
    if (out.length >= LIMITS.reminders) break;
    const o = obj(raw);
    const date = o && isoDate(o.date);
    if (!o || !date || typeof o.time !== "string" || !TIME.test(o.time)) continue;
    out.push({ id: safeId(o.id) ?? freshId("r"), date, time: o.time, note: str(o.note, 500), done: o.done === true });
  }
  return out;
}

function specialDays(v: unknown): SpecialDay[] {
  const out: SpecialDay[] = [];
  for (const raw of arr(v)) {
    if (out.length >= LIMITS.specialDays) break;
    const o = obj(raw);
    if (!o || typeof o.date !== "string" || !DAY_MONTH.test(o.date)) continue;
    out.push({ id: safeId(o.id) ?? freshId("d"), label: str(o.label, 80), date: o.date });
  }
  return out;
}

/** One contact from an untrusted source, or null when it has no name. */
export function sanitizeContact(raw: unknown): ContactForm | null {
  const c = obj(raw);
  const fullName = c ? str(c.fullName, 200).trim() : "";
  if (!c || !fullName) return null;
  const socials = arr(c.socials)
    .map(obj)
    .filter((s): s is Record<string, unknown> => !!s && typeof s.platform === "string" && typeof s.handle === "string")
    .slice(0, LIMITS.socials)
    .map((s) => ({ platform: str(s.platform, 40), handle: str(s.handle, 200) }));
  return {
    id: safeId(c.id),
    fullName,
    company: str(c.company, 200),
    jobTitle: str(c.jobTitle, 200),
    birthday: typeof c.birthday === "string" && parseBirthday(c.birthday.slice(0, 20)) ? c.birthday.slice(0, 20) : "",
    relationship: str(c.relationship, 100),
    closenessTag: optStr(c.closenessTag, 50),
    metWhere: str(c.metWhere, 200),
    phone: str(c.phone, 40),
    email: str(c.email, 200),
    website: str(c.website, 500),
    linkedin: optStr(c.linkedin, 300),
    instagram: str(c.instagram, 200),
    city: str(c.city, 200),
    socials: socials as ContactForm["socials"],
    tags: str(c.tags, 500),
    priority: str(c.priority, 50),
    lastContactDate: isoDate(c.lastContactDate) ?? "",
    reminderFreq: str(c.reminderFreq, 50),
    reminderIntervalDays: int(c.reminderIntervalDays, 1, 3650),
    reminderIntervalStart: isoDate(c.reminderIntervalStart),
    reminderEnabled: bool(c.reminderEnabled),
    snoozedUntil: isoDate(c.snoozedUntil),
    notes: str(c.notes, 20_000),
    createdAt: isoDateTime(c.createdAt),
    updatedAt: isoDateTime(c.updatedAt),
    order: int(c.order, -1e9, 1e9),
    interactions: interactions(c.interactions),
    avatarId: typeof c.avatarId === "string" && isKnownAvatar(c.avatarId) ? c.avatarId : undefined,
    deviceContactId: optStr(c.deviceContactId, 200),
    extraPhones: arr(c.extraPhones).filter((p): p is string => typeof p === "string").map((p) => p.slice(0, 40)).slice(0, LIMITS.extraPhones),
    reminders: reminders(c.reminders),
    specialDays: specialDays(c.specialDays),
  };
}

/** Contacts from an untrusted list: capped, cleaned, ids unique. */
export function sanitizeContacts(list: unknown): ContactForm[] {
  const seen = new Set<string>();
  const out: ContactForm[] = [];
  for (const raw of arr(list)) {
    if (out.length >= LIMITS.contacts) break;
    const c = sanitizeContact(raw);
    if (!c) continue;
    if (c.id && seen.has(c.id)) c.id = undefined;
    if (c.id) seen.add(c.id);
    out.push(c);
  }
  return out;
}

const LANGS = ["system", "tr", "en"] as const;
const THEMES = ["system", "light", "dark"] as const;

/**
 * The settings a backup may carry to a new phone. Privacy and security
 * choices (analytics, app lock, accepted terms, onboarding state) are never
 * taken from a file: they stay what this phone already has.
 */
export function sanitizePortableSettings(raw: unknown): Partial<UserSettings> {
  const s = obj(raw);
  if (!s) return {};
  const out: Partial<UserSettings> = {};
  const put = <K extends keyof UserSettings>(k: K, v: UserSettings[K] | undefined) => {
    if (v !== undefined) out[k] = v;
  };
  put("userName", optStr(s.userName, 100));
  put("email", optStr(s.email, 200));
  put("phone", optStr(s.phone, 40));
  put("city", optStr(s.city, 100));
  put("title", optStr(s.title, 120));
  put("company", optStr(s.company, 120));
  put("about", optStr(s.about, 200));
  put("website", optStr(s.website, 300));
  put("linkedin", optStr(s.linkedin, 300));
  put("address", optStr(s.address, 200));
  put("userAvatarId", typeof s.userAvatarId === "string" && isKnownAvatar(s.userAvatarId) ? s.userAvatarId : undefined);
  put("reachOutThresholdDays", int(s.reachOutThresholdDays, 1, 365));
  put("defaultContactIntervalDays", int(s.defaultContactIntervalDays, 1, 365));
  put("weeklyGoal", int(s.weeklyGoal, 1, 50));
  put("notifyHour", int(s.notifyHour, 0, 23));
  put("quietStart", int(s.quietStart, 0, 23));
  put("quietEnd", int(s.quietEnd, 0, 23));
  put("quietHoursEnabled", bool(s.quietHoursEnabled));
  put("haptics", bool(s.haptics));
  put("notif_birthday", bool(s.notif_birthday));
  put("notif_followUp", bool(s.notif_followUp));
  put("notif_weeklySummary", bool(s.notif_weeklySummary));
  put("notif_smartNudge", bool(s.notif_smartNudge));
  put("notif_dailySummary", bool(s.notif_dailySummary));
  put("language", LANGS.includes(s.language as (typeof LANGS)[number]) ? (s.language as UserSettings["language"]) : undefined);
  put("theme", THEMES.includes(s.theme as (typeof THEMES)[number]) ? (s.theme as UserSettings["theme"]) : undefined);
  put("goals", Array.isArray(s.goals) ? s.goals.filter((g): g is string => typeof g === "string").map((g) => g.slice(0, 40)).slice(0, 10) : undefined);
  const show = obj(s.cardShow);
  if (show) {
    const keys: (keyof CardShow)[] = ["phone", "email", "city", "website", "linkedin", "address"];
    const cs = {} as CardShow;
    let ok = true;
    for (const k of keys) {
      if (typeof show[k] === "boolean") cs[k] = show[k] as boolean;
      else ok = false;
    }
    if (ok) out.cardShow = cs;
  }
  return out;
}
