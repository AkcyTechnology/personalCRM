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

  it("ignores contacts without any date and does not start new users at 0", () => {
    expect(averageHealthScore([], 14)).toBe(100);
    expect(averageHealthScore([c({}), c({ lastContactDate: daysAgo(0) })], 14)).toBe(100);
  });

  it("one overdue contact among healthy ones is not a failing score", () => {
    const list = [c({ lastContactDate: daysAgo(30) }), c({ lastContactDate: daysAgo(1) }), c({ lastContactDate: daysAgo(2) })];
    expect(averageHealthScore(list, 14)).toBeGreaterThan(55);
  });
});
