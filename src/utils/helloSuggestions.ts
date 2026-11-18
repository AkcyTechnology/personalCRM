import type { ContactForm } from "../screens/AddContactScreen";
import { parseISODate, toISODate } from "./dates";
import { t } from "../i18n";

/**
 * Two short "Merhaba de" openers, picked only from what the app already
 * stores about the person: their group and whether/when a catch-up was
 * logged. Templates never mention where you met, a date or a shared
 * interest, and never use emoji. No external service is involved.
 */
export type HelloKind = "new" | "longGap" | "family" | "work" | "friend" | "general";

const WORK = new Set(["İş arkadaşı", "Mentor", "Mentee", "Müşteri", "Potansiyel müşteri"]);
const FRIEND = new Set(["Arkadaş", "Okul"]);
const NEW_DAYS = 30;
const GAP_DAYS = 30;

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

/** Latest completed catch-up (today or earlier), or null. */
function lastDone(c: ContactForm, now: Date): string | null {
  const today = toISODate(now);
  let best = "";
  for (const d of [c.lastContactDate, ...(c.interactions ?? []).map((i) => i.date)]) {
    if (d && d <= today && d > best && parseISODate(d)) best = d;
  }
  return best || null;
}

function daysBetween(iso: string, now: Date): number {
  const d = parseISODate(iso.slice(0, 10));
  if (!d) return 0;
  const today = parseISODate(toISODate(now))!;
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

export function helloKind(c: ContactForm, now: Date = new Date()): HelloKind {
  const group = c.relationship?.trim() ?? "";
  const last = lastDone(c, now);
  if (!last && group !== "Aile" && c.createdAt && daysBetween(c.createdAt, now) <= NEW_DAYS) return "new";
  if (last && daysBetween(last, now) >= GAP_DAYS) return "longGap";
  if (group === "Aile") return "family";
  if (WORK.has(group)) return "work";
  if (FRIEND.has(group)) return "friend";
  return "general";
}

export function helloSuggestions(c: ContactForm, now: Date = new Date()): [string, string] {
  const name = firstName(c.fullName);
  switch (helloKind(c, now)) {
    case "new":
      return [
        t("Merhaba {name}, tanıştığımıza sevindim! Haftan nasıl gidiyor?", { name }),
        t("Selam {name}, sohbetimize devam etmek isterim. Bu hafta müsait misin?", { name }),
      ];
    case "longGap":
      return [
        t("Selam {name}, bugün aklıma geldin. Nasılsın?", { name }),
        t("Merhaba {name}, bir ara kahve içip sohbet edelim mi?", { name }),
      ];
    case "family":
      return [
        t("Merhaba {name}, nasılsın? Seni merak ettim.", { name }),
        t("Selam {name}, bu hafta bir ara konuşalım mı?", { name }),
      ];
    case "work":
      return [
        t("Merhaba {name}, umarım haftan iyi geçiyor. Nasıl gidiyor?", { name }),
        t("Merhaba {name}, uygun olduğunda kısa bir sohbet etmek isterim. Bu hafta müsait misin?", { name }),
      ];
    case "friend":
      return [
        t("Selam {name}, nasılsın? Bu aralar neler yapıyorsun?", { name }),
        t("Selam {name}, bir ara buluşalım mı? Bu hafta müsait misin?", { name }),
      ];
    default:
      return [
        t("Merhaba {name}, nasılsın?", { name }),
        t("Selam {name}, bu aralar neler yapıyorsun?", { name }),
      ];
  }
}

// ── Session drafts ───────────────────────────────────────────────────────────
// Kept in memory for this app session only, one per person, so reopening the
// panel for the same person brings the draft back and another person never
// inherits it.

export type HelloDraft = { text: string; fromSuggestion: string | null };
const drafts = new Map<string, HelloDraft>();

export function getHelloDraft(id: string): HelloDraft | undefined {
  return drafts.get(id);
}

export function setHelloDraft(id: string, draft: HelloDraft): void {
  if (draft.text) drafts.set(id, draft);
  else drafts.delete(id);
}
