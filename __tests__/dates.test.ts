import { nextBirthday, parseBirthday, parseISODate, toISODate } from "../src/utils/dates";

describe("dates", () => {
  it("formats local dates without UTC shift", () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(parseISODate("2026-03-09")?.getDate()).toBe(9);
    expect(parseISODate("bozuk")).toBeNull();
  });

  it("parses DD/MM/YYYY birthdays", () => {
    expect(parseBirthday("12/04/1995")).toEqual({ day: 12, month: 4, year: 1995 });
    expect(parseBirthday("31/13/1995")).toBeNull();
  });

  it("finds the next birthday", () => {
    const now = new Date(2026, 9, 17);
    expect(toISODate(nextBirthday("12/04/1995", now)!)).toBe("2027-04-12");
    expect(toISODate(nextBirthday("17/10/1990", now)!)).toBe("2026-10-17");
    expect(toISODate(nextBirthday("20/12/1990", now)!)).toBe("2026-12-20");
  });
});
