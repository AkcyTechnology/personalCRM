import { agoLabel, badges, currentWeek, dailyPeople, recentMoments, trName, weekPlans } from "../src/utils/homeData";
import { addDays, toISODate } from "../src/utils/dates";
import { setLanguage } from "../src/i18n";
import type { ContactForm } from "../src/screens/AddContactScreen";

beforeAll(() => setLanguage("tr"));
const now = new Date(2026, 10, 18, 12); // Wed 18 Nov 2026
const day = (n: number) => toISODate(addDays(new Date(2026, 10, 18), n));
const p = (id: string, extra: Partial<ContactForm> = {}): ContactForm => ({ id, fullName: `Kişi ${id}`, ...extra } as ContactForm);

describe("trName", () => {
  it("follows vowel harmony and the buffer y", () => {
    expect(["Berrin", "Ayşe", "Can", "Mert", "Ece", "Oya", "Umut", "Gül"].map((n) => trName(n, "dative")))
      .toEqual(["Berrin’e", "Ayşe’ye", "Can’a", "Mert’e", "Ece’ye", "Oya’ya", "Umut’a", "Gül’e"]);
    expect(["Berrin", "Ayşe", "Can", "Oya"].map((n) => trName(n, "with"))).toEqual(["Berrin’le", "Ayşe’yle", "Can’la", "Oya’yla"]);
  });
});

describe("agoLabel", () => {
  it("rounds to days, weeks, months and years", () => {
    expect([0, -1, -3, -10, -150, -400].map((d) => agoLabel(day(d), now))).toEqual(["Bugün", "Dün", "3 gün önce", "1 hafta önce", "5 ay önce", "1 yıl önce"]);
  });
});

describe("this week", () => {
  it("runs Monday to Sunday and counts different people per day", () => {
    const week = currentWeek(now);
    expect(week.map((d) => d.iso)).toEqual([day(-2), day(-1), day(0), day(1), day(2), day(3), day(4)]);
    expect(week[2].isToday).toBe(true);
    const list = [
      p("a", { interactions: [{ id: "1", type: "call", date: day(0) }, { id: "2", type: "call", date: day(0) }] }),
      p("b", { interactions: [{ id: "3", type: "call", date: day(0) }, { id: "4", type: "call", date: day(-2) }] }),
    ];
    expect(dailyPeople(list, now)).toEqual([1, 0, 2, 0, 0, 0, 0]);
  });
  it("lists open reminders and birthdays in the next seven days as plans", () => {
    const list = [
      p("a", { reminders: [{ id: "r1", date: day(2), time: "09:00", note: "Ara" }, { id: "r2", date: day(1), time: "09:00", note: "", done: true }] }),
      p("b", { birthday: "21/11/1990" }),
      p("c", { reminders: [{ id: "r3", date: day(9), time: "09:00", note: "" }, { id: "r4", date: day(-1), time: "09:00", note: "" }] }),
    ];
    expect(weekPlans(list, now).map((x) => [x.contact.id, x.date, x.kind])).toEqual([["b", day(3), "birthday"], ["a", day(2), "reminder"]].sort((x, y) => String(x[1]).localeCompare(String(y[1]))));
  });
});

describe("recentMoments and badges", () => {
  it("lists completed catch-ups newest first and skips future ones", () => {
    const list = [p("a", { interactions: [{ id: "1", type: "call", date: day(-10) }, { id: "2", type: "call", date: day(3) }] }), p("b", { interactions: [{ id: "3", type: "message", date: day(-1) }] })];
    expect(recentMoments(list, 5, now).map((m) => [m.contact.id, m.date])).toEqual([["b", day(-1)], ["a", day(-10)]]);
  });
  it("earns the first badge with the first catch-up only", () => {
    expect(badges([p("a")], 3, now).find((b) => b.id === "seed")?.earned).toBe(false);
    expect(badges([p("a", { interactions: [{ id: "1", type: "call", date: day(-1) }] })], 3, now).find((b) => b.id === "seed")?.earned).toBe(true);
  });
});
