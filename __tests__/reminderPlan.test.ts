import { followUpDate, planReminders } from "../src/utils/reminderPlan";
import type { ContactForm } from "../src/screens/AddContactScreen";

const base: ContactForm = {
  fullName: "Zeynep Kaya", company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "",
  phone: "", email: "", website: "", instagram: "", city: "", socials: [], tags: "", priority: "",
  lastContactDate: "", reminderFreq: "", notes: "",
};

const settings = {
  reachOutThresholdDays: 14,
  notif_birthday: true,
  notif_followUp: true,
  notif_weeklySummary: true,
  notif_smartNudge: true,
};

const now = new Date(2026, 9, 17, 12, 0); // 17 Ekim 2026, Cumartesi 12:00

describe("followUpDate", () => {
  it("schedules at interval end, 10:00", () => {
    const d = followUpDate({ ...base, id: "a", lastContactDate: "2026-10-10", reminderIntervalDays: 14 }, 14, now)!;
    expect(d).toEqual(new Date(2026, 9, 24, 10, 0));
  });

  it("overdue contacts are reminded the next morning, never in the past", () => {
    const d = followUpDate({ ...base, id: "a", lastContactDate: "2026-01-01" }, 14, now)!;
    expect(d).toEqual(new Date(2026, 9, 18, 10, 0));
  });

  it("respects snooze and disabled reminders", () => {
    const snoozed = followUpDate({ ...base, id: "a", lastContactDate: "2026-01-01", snoozedUntil: "2026-10-30" }, 14, now)!;
    expect(snoozed).toEqual(new Date(2026, 9, 30, 10, 0));
    expect(followUpDate({ ...base, id: "a", lastContactDate: "2026-01-01", reminderEnabled: false }, 14, now)).toBeNull();
  });
});

describe("planReminders", () => {
  const contacts: ContactForm[] = [
    { ...base, id: "a", lastContactDate: "2026-01-01", birthday: "20/10/1995" },
    { ...base, id: "b", fullName: "Mert Demir", lastContactDate: "2026-10-16" },
  ];

  it("plans follow-ups, birthdays, nudge and weekly summary", () => {
    const plan = planReminders(contacts, settings, now);
    const kinds = plan.map((p) => p.kind);
    expect(kinds.filter((k) => k === "followUp")).toHaveLength(2);
    expect(kinds.filter((k) => k === "birthday")).toHaveLength(2);
    expect(kinds).toContain("smartNudge");
    expect(kinds[kinds.length - 1]).toBe("weeklySummary");
    for (const p of plan) if ("date" in p) expect(p.date.getTime()).toBeGreaterThan(now.getTime());
  });

  it("honours disabled categories", () => {
    const plan = planReminders(contacts, { ...settings, notif_birthday: false, notif_weeklySummary: false, notif_smartNudge: false }, now);
    expect(plan.every((p) => p.kind === "followUp")).toBe(true);
  });

  it("caps dated notifications below the iOS limit", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ ...base, id: String(i), lastContactDate: "2026-01-01", birthday: "01/01/1990" }));
    const plan = planReminders(many, settings, now);
    expect(plan.length).toBeLessThanOrEqual(64);
  });
});
