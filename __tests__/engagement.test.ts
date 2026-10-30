import {
  monthlyStory, onThisDay, peopleThisWeek, personOfTheDay, relationshipJourney, todaysSparks, weekKey, weeklyStreak,
} from "../src/utils/engagement";
import type { ContactForm, Interaction } from "../src/screens/AddContactScreen";

let n = 0;
const ix = (date: string, extra: Partial<Interaction> = {}): Interaction => ({ id: `i${n++}`, date, type: "call", ...extra });
const c = (id: string, extra: Partial<ContactForm> = {}): ContactForm => ({
  id, fullName: `Kişi ${id}`, company: "", jobTitle: "", birthday: "", relationship: "Arkadaş", metWhere: "", phone: "",
  email: "", website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "", reminderFreq: "",
  notes: "", ...extra,
});

// 2026-10-17 is a Saturday; its week starts Monday 2026-10-12.
const now = new Date(2026, 9, 17, 12);

describe("weeks", () => {
  it("uses Monday-based weeks", () => {
    expect(weekKey(new Date(2026, 9, 17))).toBe("2026-10-12");
    expect(weekKey(new Date(2026, 9, 12))).toBe("2026-10-12");
    expect(weekKey(new Date(2026, 9, 11))).toBe("2026-10-05");
  });
});

describe("weeklyStreak", () => {
  it("is empty without moments", () => {
    expect(weeklyStreak([], now)).toEqual({ current: 0, best: 0, freezes: 0, thisWeekDone: false });
  });

  it("counts consecutive weeks and keeps the streak alive during the current week", () => {
    const list = [c("a", { interactions: [ix("2026-09-28"), ix("2026-10-06")] })];
    const s = weeklyStreak(list, now);
    expect(s.current).toBe(2);
    expect(s.thisWeekDone).toBe(false);
  });

  it("breaks on a missed week without freezes", () => {
    const list = [c("a", { interactions: [ix("2026-09-21"), ix("2026-10-06"), ix("2026-10-13")] })];
    expect(weeklyStreak(list, now).current).toBe(2);
  });

  it("earns a freeze every 4 weeks and uses it for one missed week", () => {
    const weeks = ["2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", /* gap 09-28 */ "2026-10-05", "2026-10-12"];
    const s = weeklyStreak([c("a", { interactions: weeks.map((d) => ix(d)) })], now);
    expect(s.current).toBe(6);
    expect(s.freezes).toBe(0);
    expect(s.thisWeekDone).toBe(true);
  });

  it("counts distinct people this week", () => {
    const list = [c("a", { interactions: [ix("2026-10-13"), ix("2026-10-14")] }), c("b", { lastContactDate: "2026-10-16" }), c("x", { lastContactDate: "2026-10-01" })];
    expect(peopleThisWeek(list, now)).toBe(2);
  });
});

describe("personOfTheDay", () => {
  const list = [
    c("a", { lastContactDate: "2026-01-01" }),
    c("b", { lastContactDate: "2026-10-16" }),
    c("s", { lastContactDate: "2025-01-01", snoozedUntil: "2999-01-01" }),
    c("m", { lastContactDate: "2025-01-01", reminderEnabled: false }),
  ];

  it("is stable within a day and never picks snoozed or muted people", () => {
    const p1 = personOfTheDay(list, 14, now);
    const p2 = personOfTheDay(list, 14, new Date(2026, 9, 17, 23));
    expect(p1?.id).toBe(p2?.id);
    expect(["s", "m"]).not.toContain(p1?.id);
  });

  it("returns null when nobody is eligible", () => {
    expect(personOfTheDay([], 14, now)).toBeNull();
  });
});

describe("todaysSparks", () => {
  it("builds reconnect, birthday and follow-up sparks and marks done ones", () => {
    const list = [
      c("old", { lastContactDate: "2026-01-01" }),
      c("bday", { birthday: "20/10/1995", lastContactDate: "2026-10-01" }),
      c("note", { interactions: [ix("2026-10-10", { note: "Yeni işe başladı" })], lastContactDate: "2026-10-10" }),
    ];
    const sparks = todaysSparks(list, 14, now);
    expect(sparks.map((s) => s.kind)).toEqual(["reconnect", "birthday", "followUp"]);
    expect(sparks.every((s) => !s.done)).toBe(true);

    list[0].interactions = [ix("2026-10-17")];
    expect(todaysSparks(list, 14, now)[0]).toMatchObject({ kind: "reconnect", done: true });
  });

  it("falls back to a meet-up spark", () => {
    expect(todaysSparks([], 14, now).map((s) => s.kind)).toEqual(["meetUp"]);
  });
});

describe("memories and story", () => {
  it("finds moments from previous years on the same day", () => {
    const list = [c("a", { interactions: [ix("2025-10-17", { note: "Kahve" }), ix("2026-10-17")] })];
    const m = onThisDay(list, now);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ yearsAgo: 1, kind: "moment" });
  });

  it("summarises the month", () => {
    const list = [
      c("a", { relationship: "Aile", interactions: [ix("2026-05-01"), ix("2026-10-02", { type: "meeting" }), ix("2026-10-09")] }),
      c("b", { createdAt: "2026-10-05T10:00:00Z", interactions: [ix("2026-10-06")] }),
    ];
    const s = monthlyStory(list, now);
    expect(s).toMatchObject({ monthKey: "2026-10", people: 2, moments: 3, reconnected: 1, newPeople: 1, inPerson: 1, topCircle: "Aile" });
    expect(s.topPerson?.id).toBe("a");
  });

  it("describes a relationship journey", () => {
    const j = relationshipJourney(c("a", { createdAt: "2026-01-01T00:00:00Z", interactions: [ix("2026-02-01"), ix("2026-04-02")] }));
    expect(j).toMatchObject({ since: "2026-01-01", moments: 2, longestGapDays: 60, averageGapDays: 60 });
  });
});

describe("treeState", () => {
  const { treeState } = require("../src/utils/engagement") as typeof import("../src/utils/engagement");
  const now = new Date(2026, 9, 15);
  const withMoments = (dates: string[]) => [{ id: "a", fullName: "A", interactions: dates.map((date) => ({ id: date, type: "call", date })) }] as never;

  it("starts as a resting seed", () => {
    expect(treeState([], now)).toMatchObject({ stage: 0, moments: 0, toNext: 1, leaves: 0, vitality: "resting" });
  });

  it("sprouts on the first moment and counts towards the next stage", () => {
    const s = treeState(withMoments(["2026-10-14"]), now);
    expect(s).toMatchObject({ stage: 1, toNext: 2, blossoms: 1, vitality: "growing" });
  });

  it("never shrinks when the user is away — it only rests", () => {
    const old = Array.from({ length: 12 }, (_, i) => `2025-01-${String(i + 1).padStart(2, "0")}`);
    const s = treeState(withMoments(old), now);
    expect(s.stage).toBe(3);
    expect(s.vitality).toBe("resting");
    expect(s.blossoms).toBe(0);
  });

  it("thrives with three recent moments and caps at the last stage", () => {
    const many = Array.from({ length: 60 }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`);
    many.push("2026-10-10", "2026-10-12", "2026-10-14");
    const s = treeState(withMoments(many), now);
    expect(s).toMatchObject({ stage: 5, toNext: 0, progress: 1, vitality: "thriving" });
  });
});
