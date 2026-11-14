import AsyncStorage from "@react-native-async-storage/async-storage";
import { connectionStatus, healthScoreLabel, MIN_SCORED_PEOPLE } from "../src/utils/healthScore";
import { daysSinceLastContact, dueContacts, hasAnyHistory, weekStats } from "../src/utils/stats";
import { addContact, deleteInteraction, loadContacts, markContacted, updateInteraction } from "../src/data/contacts";
import { addDays, toISODate } from "../src/utils/dates";
import type { ContactForm } from "../src/screens/AddContactScreen";

jest.mock("../src/components/Toast", () => ({ showToast: jest.fn() }));

const person = (fullName: string, extra: Partial<ContactForm> = {}): ContactForm => ({
  fullName, company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "", phone: "", email: "",
  website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "", reminderFreq: "",
  notes: "", ...extra,
});

// Wednesday 2026-10-28: the week is Mon 26 Oct – Sun 1 Nov.
const now = new Date(2026, 9, 28, 12);
const day = (offset: number) => toISODate(addDays(new Date(2026, 9, 28), offset));

describe("weekly progress", () => {
  it("counts distinct people with a moment from Monday to Sunday", () => {
    const list = [
      person("A", { id: "a", interactions: [{ id: "1", type: "call", date: day(0) }, { id: "2", type: "call", date: day(-1) }] }),
      person("B", { id: "b", interactions: [{ id: "3", type: "call", date: day(-2) }] }), // Monday
      person("C", { id: "c", interactions: [{ id: "4", type: "call", date: day(-3) }] }), // last Sunday
    ];
    const w = weekStats(list, 3, now);
    expect(w.people).toBe(2);
    expect(w.moments).toBe(3);
    expect(w.goal).toBe(3);
    expect(w.reached).toBe(false);
    expect(toISODate(w.start)).toBe("2026-10-26");
    expect(toISODate(w.end)).toBe("2026-11-01");
  });

  it("does not count notes as moments", () => {
    const list = [person("A", { id: "a", notes: "Yeni işine başlayacaktı" })];
    expect(weekStats(list, 3, now).moments).toBe(0);
    expect(hasAnyHistory(list)).toBe(false);
  });

  it("does not count the same moment twice when lastContactDate mirrors it", () => {
    const list = [person("A", { id: "a", lastContactDate: day(0), interactions: [{ id: "1", type: "call", date: day(0) }] })];
    expect(weekStats(list, 3, now).moments).toBe(1);
  });
});

describe("connection status", () => {
  it("needs recorded contacts before it shows a number", () => {
    const fresh = [person("A", { id: "a", reminderIntervalStart: day(0) }), person("B", { id: "b" })];
    const s = connectionStatus(fresh, 14);
    expect(s.score).toBeNull();
    expect(healthScoreLabel(s.score)).toBe("Henüz yeterli veri yok");
  });

  it("averages only people with a recorded contact date", () => {
    const known = Array.from({ length: MIN_SCORED_PEOPLE }, (_, i) => person(`K${i}`, { id: `k${i}`, lastContactDate: toISODate(new Date()) }));
    const s = connectionStatus([...known, person("Imported", { id: "x", reminderIntervalStart: toISODate(new Date()) })], 14);
    expect(s.scored).toBe(MIN_SCORED_PEOPLE);
    expect(s.score).toBe(100);
  });

  it("unknown last contact is null, never a made-up number of days", () => {
    expect(daysSinceLastContact(person("A"), now)).toBeNull();
    expect(daysSinceLastContact(person("A", { interactions: [{ id: "1", type: "call", date: day(-5) }] }), now)).toBe(5);
  });

  it("puts the most overdue person first", () => {
    const list = [person("Late", { id: "1", lastContactDate: toISODate(addDays(new Date(), -40)) }), person("OK", { id: "2", lastContactDate: toISODate(addDays(new Date(), -16)) })];
    expect(dueContacts(list, 14).map((c) => c.fullName)).toEqual(["Late", "OK"]);
  });
});

describe("editing and deleting moments", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("deleting the latest moment moves lastContactDate back, so it stops counting", async () => {
    await addContact(person("Ayşe", { id: "a" }));
    await markContacted("a", "call", "", "2026-10-20");
    const saved = await markContacted("a", "meeting", "", "2026-10-27");
    const latest = saved!.interactions!.find((i) => i.date === "2026-10-27")!;
    const after = await deleteInteraction("a", latest.id);
    expect(after!.lastContactDate).toBe("2026-10-20");
    expect(weekStats(await loadContacts(), 3, now).moments).toBe(0);
  });

  it("editing a moment's date updates the stats", async () => {
    await addContact(person("Can", { id: "c" }));
    const saved = await markContacted("c", "call", "eski", "2026-10-10");
    const id = saved!.interactions![0].id;
    const after = await updateInteraction("c", id, { date: "2026-10-27", note: "kahve" });
    expect(after!.lastContactDate).toBe("2026-10-27");
    expect(after!.interactions![0].note).toBe("kahve");
    expect(weekStats(await loadContacts(), 3, now)).toMatchObject({ people: 1, moments: 1 });
  });
});
