import { averageHealthScore, healthScore } from "../src/utils/healthScore";
import { toISODate, addDays } from "../src/utils/dates";
import type { ContactForm } from "../src/screens/AddContactScreen";

const daysAgo = (n: number) => toISODate(addDays(new Date(), -n));
const c = (extra: Partial<ContactForm>): ContactForm => ({
  fullName: "X", company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "", phone: "", email: "",
  website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "", reminderFreq: "",
  notes: "", ...extra,
});

describe("healthScore", () => {
  it("stays healthy within the interval and degrades gently after", () => {
    expect(healthScore(c({ lastContactDate: daysAgo(0) }), 14)).toBe(100);
    expect(healthScore(c({ lastContactDate: daysAgo(14) }), 14)).toBe(60);
    expect(healthScore(c({ lastContactDate: daysAgo(21) }), 14)).toBe(45);
    expect(healthScore(c({ lastContactDate: daysAgo(28) }), 14)).toBe(30);
    expect(healthScore(c({ lastContactDate: daysAgo(42) }), 14)).toBe(0);
  });

  it("treats snoozed contacts as on track", () => {
    expect(healthScore(c({ lastContactDate: daysAgo(60), snoozedUntil: "2999-01-01" }), 14)).toBe(100);
  });

  it("returns no score instead of a flattering 100 when there is not enough data", () => {
    expect(averageHealthScore([], 14)).toBeNull();
    // An imported contact has only a reminder start date — not a recorded contact.
    const imported = c({ reminderIntervalStart: daysAgo(0) });
    expect(healthScore(imported, 14)).toBeNull();
    expect(averageHealthScore([imported, imported, imported, c({ lastContactDate: daysAgo(0) })], 14)).toBeNull();
    expect(averageHealthScore([1, 2, 3].map((d) => c({ lastContactDate: daysAgo(d) })), 14)).not.toBeNull();
  });

  it("one overdue contact among healthy ones is not a failing score", () => {
    const list = [c({ lastContactDate: daysAgo(30) }), c({ lastContactDate: daysAgo(1) }), c({ lastContactDate: daysAgo(2) })];
    expect(averageHealthScore(list, 14)).toBeGreaterThan(55);
  });
});
