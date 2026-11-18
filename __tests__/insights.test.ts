import { contactRecency, insightFacts, withTr } from "../src/utils/insights";
import { addDays, toISODate } from "../src/utils/dates";
import type { ContactForm } from "../src/screens/AddContactScreen";

const now = new Date(2026, 10, 18, 12); // Wed 18 Nov 2026
const day = (offset: number) => toISODate(addDays(new Date(2026, 10, 18), offset));
const p = (id: string, relationship: string, dates: number[], type: "call" | "message" = "call"): ContactForm =>
  ({ id, fullName: `Kişi ${id}`, relationship, interactions: dates.map((d, i) => ({ id: `${id}${i}`, type, date: day(d) })) } as ContactForm);

describe("contactRecency", () => {
  it("puts each person in exactly one group by their latest completed catch-up", () => {
    const r = contactRecency([
      p("a", "Arkadaş", [0, -2, -40]), // several catch-ups, counted once, recent
      p("b", "Arkadaş", [-29]),        // day 30 counting today: recent
      p("c", "Aile", [-30]),           // 31 days ago: older
      p("d", "Aile", [-90]),
      p("e", "Okul", []),
      p("f", "Okul", [5]),             // only a future-dated entry: never
    ], now);
    expect(r).toEqual({ total: 6, recent: 2, older: 2, never: 2 });
  });
  it("handles no people", () => {
    expect(contactRecency([], now)).toEqual({ total: 0, recent: 0, older: 0, never: 0 });
  });
});

describe("insightFacts", () => {
  it("finds the most-met group, a quiet group, the longest gap and the main channel", () => {
    const f = insightFacts([
      p("a", "Arkadaş", [0, -8], "message"), p("b", "Arkadaş", [-3], "message"), p("c", "İş arkadaşı", [-5]),
      p("d", "Aile", [-60]), p("e", "Aile", []),
    ], 3, now);
    expect(f.topGroup).toEqual({ group: "Arkadaş", people: 2 });
    expect(f.quietGroup).toEqual({ group: "Aile", people: 2 });
    expect(f.longestGap?.contact.id).toBe("d");
    expect(f.longestGap?.days).toBe(60);
    expect(f.channel).toEqual({ type: "message", count: 3, total: 4 });
    // Only "a" is this week (Mon 16 Nov onwards).
    expect(f.goal).toEqual({ left: 2, reached: false });
  });
  it("says nothing without people", () => {
    expect(insightFacts([], 3, now)).toEqual({});
  });
});

describe("withTr", () => {
  it("follows how the number is read", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 60, 100, 1000, 13].map(withTr)).toEqual([
      "0’ıyla", "1’iyle", "2’siyle", "3’üyle", "4’üyle", "5’iyle", "6’sıyla", "7’siyle", "8’iyle", "9’uyla",
      "10’uyla", "20’siyle", "30’uyla", "40’ıyla", "60’ıyla", "100’üyle", "1000’iyle", "13’üyle",
    ]);
  });
});
