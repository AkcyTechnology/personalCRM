import {
  activeFilterCount,
  EMPTY_FILTERS,
  filterPeople,
  lastContactBucket,
  matchesQuick,
  reminderState,
  sortPeople,
} from "../src/utils/peopleFilters";
import type { ContactForm } from "../src/screens/AddContactScreen";

const now = new Date(2026, 10, 15, 12); // 15 Nov 2026
const p = (fullName: string, extra: Partial<ContactForm> = {}): ContactForm => ({
  fullName, company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "", phone: "", email: "",
  website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "", reminderFreq: "",
  notes: "", ...extra,
});

describe("reminder state and quick filters", () => {
  it("overdue, today, future and none", () => {
    expect(reminderState(p("A", { lastContactDate: "2026-10-01" }), 14, now)).toBe("overdue");
    expect(reminderState(p("B", { lastContactDate: "2026-11-01" }), 14, now)).toBe("today");
    expect(reminderState(p("C", { lastContactDate: "2026-11-10" }), 14, now)).toBe("future");
    expect(reminderState(p("D", { reminderEnabled: false }), 14, now)).toBe("none");
  });

  it("a snooze moves an overdue catch-up into the future", () => {
    expect(reminderState(p("A", { lastContactDate: "2026-10-01", snoozedUntil: "2026-11-18" }), 14, now)).toBe("future");
  });

  it("an open dated reminder counts; a done one doesn't", () => {
    const off = { reminderEnabled: false as const };
    expect(reminderState(p("A", { ...off, reminders: [{ id: "1", date: "2026-11-14", time: "09:00", note: "" }] }), 14, now)).toBe("overdue");
    expect(reminderState(p("A", { ...off, reminders: [{ id: "1", date: "2026-11-14", time: "09:00", note: "", done: true }] }), 14, now)).toBe("none");
  });

  it("'Zamanı gelen' = today or past; 'Sonraki 7 gün' = after today up to 7 days, birthdays and special days included", () => {
    expect(matchesQuick(p("A", { lastContactDate: "2026-11-01" }), "due", 14, now)).toBe(true);
    expect(matchesQuick(p("A", { lastContactDate: "2026-11-01" }), "week", 14, now)).toBe(false);
    expect(matchesQuick(p("B", { lastContactDate: "2026-11-05" }), "week", 14, now)).toBe(true); // due 19 Nov
    expect(matchesQuick(p("C", { reminderEnabled: false, birthday: "20/11/1990" }), "week", 14, now)).toBe(true);
    expect(matchesQuick(p("D", { reminderEnabled: false, specialDays: [{ id: "s", label: "Yıl dönümü", date: "22/11" }] }), "week", 14, now)).toBe(true);
    expect(matchesQuick(p("E", { reminderEnabled: false, birthday: "30/11/1990" }), "week", 14, now)).toBe(false);
  });
});

describe("advanced filters and search", () => {
  const list = [
    p("Ayşe Demir", { id: "1", relationship: "Aile", city: "İzmir", tags: "okul, komşu", lastContactDate: "2026-11-12" }),
    p("Can Yılmaz", { id: "2", relationship: "Arkadaş", company: "Figma", tags: "koşu", lastContactDate: "2026-10-20" }),
    p("Deniz Kaya", { id: "3", relationship: "İş arkadaşı", company: "Figma" }),
  ];

  it("buckets the last contact", () => {
    expect(list.map((c) => lastContactBucket(c, now))).toEqual(["last7", "d8to30", "none"]);
  });

  it("ORs values inside a group and ANDs groups", () => {
    const run = (filters: Partial<typeof EMPTY_FILTERS>) =>
      filterPeople(list, { query: "", quick: "all", filters: { ...EMPTY_FILTERS, ...filters }, sort: "name", threshold: 14, now }).map((c) => c.fullName);
    expect(run({ groups: ["Aile", "Arkadaş"] })).toEqual(["Ayşe Demir", "Can Yılmaz"]);
    expect(run({ companies: ["Figma"], lastContact: ["none"] })).toEqual(["Deniz Kaya"]);
    expect(run({ tags: ["koşu", "komşu"] })).toEqual(["Ayşe Demir", "Can Yılmaz"]);
    expect(run({ cities: ["İzmir"], groups: ["Arkadaş"] })).toEqual([]);
    expect(activeFilterCount({ ...EMPTY_FILTERS, groups: ["Aile"], tags: ["a", "b"] })).toBe(3);
  });

  it("searches name, company, city and tags with Turkish case rules", () => {
    const q = (query: string) => filterPeople(list, { query, quick: "all", filters: EMPTY_FILTERS, sort: "name", threshold: 14, now }).map((c) => c.id);
    expect(q("İZMİR")).toEqual(["1"]);
    expect(q("figma")).toEqual(["2", "3"]);
    expect(q("komşu")).toEqual(["1"]);
  });
});

describe("sorting", () => {
  it("by last contact (none last), nearest reminder and newest", () => {
    const list = [
      p("Zeynep", { lastContactDate: "2026-11-01", createdAt: "2026-01-01" }),
      p("Ali", { createdAt: "2026-06-01", reminderEnabled: false }),
      p("Mert", { lastContactDate: "2026-11-10", createdAt: "2026-03-01" }),
    ];
    expect(sortPeople(list, "name", 14).map((c) => c.fullName)).toEqual(["Ali", "Mert", "Zeynep"]);
    expect(sortPeople(list, "lastContact", 14).map((c) => c.fullName)).toEqual(["Mert", "Zeynep", "Ali"]);
    expect(sortPeople(list, "nextReminder", 14).map((c) => c.fullName)).toEqual(["Zeynep", "Mert", "Ali"]);
    expect(sortPeople(list, "newest", 14).map((c) => c.fullName)).toEqual(["Ali", "Mert", "Zeynep"]);
  });
});
