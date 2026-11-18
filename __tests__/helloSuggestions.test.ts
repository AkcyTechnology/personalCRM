import { getHelloDraft, helloKind, helloSuggestions, setHelloDraft } from "../src/utils/helloSuggestions";
import { addDays, toISODate } from "../src/utils/dates";
import type { ContactForm } from "../src/screens/AddContactScreen";
import { setLanguage } from "../src/i18n";

beforeAll(() => setLanguage("tr"));

const now = new Date(2026, 10, 18, 12);
const day = (n: number) => toISODate(addDays(new Date(2026, 10, 18), n));
const c = (extra: Partial<ContactForm>): ContactForm => ({ id: "x", fullName: "Ece Yıldız", ...extra } as ContactForm);

describe("helloSuggestions", () => {
  it("uses the new-connection openers for someone added recently with no catch-up", () => {
    const s = helloSuggestions(c({ relationship: "Tanıdık", createdAt: day(-3) }), now);
    expect(s).toEqual([
      "Merhaba Ece, tanıştığımıza sevindim! Haftan nasıl gidiyor?",
      "Selam Ece, sohbetimize devam etmek isterim. Bu hafta müsait misin?",
    ]);
  });
  it("uses the long-gap openers after 30+ days, whatever the group", () => {
    const s = helloSuggestions(c({ relationship: "Arkadaş", interactions: [{ id: "1", type: "call", date: day(-45) }] }), now);
    expect(s[0]).toBe("Selam Ece, bugün aklıma geldin. Nasılsın?");
    expect(s[1]).toBe("Merhaba Ece, bir ara kahve içip sohbet edelim mi?");
  });
  it("never treats family as a new acquaintance, and ignores future-dated entries", () => {
    expect(helloKind(c({ relationship: "Aile", createdAt: day(-1) }), now)).toBe("family");
    expect(helloKind(c({ relationship: "Arkadaş", createdAt: day(-90), interactions: [{ id: "1", type: "call", date: day(5) }] }), now)).toBe("friend");
  });
  it("falls back to a general greeting and question without context", () => {
    expect(helloKind(c({}), now)).toBe("general");
    expect(helloSuggestions(c({}), now)).toEqual(["Merhaba Ece, nasılsın?", "Selam Ece, bu aralar neler yapıyorsun?"]);
  });
  it("has no emoji and no invented details", () => {
    for (const rel of ["", "Aile", "Arkadaş", "İş arkadaşı", "Okul", "Mentor"]) {
      for (const m of helloSuggestions(c({ relationship: rel }), now)) {
        expect(m).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });
});

describe("session drafts", () => {
  it("keeps one draft per person and drops empty ones", () => {
    setHelloDraft("a", { text: "Selam A", fromSuggestion: null });
    expect(getHelloDraft("a")?.text).toBe("Selam A");
    expect(getHelloDraft("b")).toBeUndefined();
    setHelloDraft("a", { text: "", fromSuggestion: null });
    expect(getHelloDraft("a")).toBeUndefined();
  });
});
