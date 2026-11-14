import { importSelected, importStatus, toContact } from "../src/utils/importPlan";
import type { DeviceContact } from "../src/utils/deviceContacts";
import type { ContactForm } from "../src/screens/AddContactScreen";

const dc = (id: string, name: string, phones: string[] = [], email = ""): DeviceContact => ({
  id, name, phone: phones[0] ?? "", phones, email, company: "", jobTitle: "", birthday: "",
});
const saved = (fullName: string, extra: Partial<ContactForm> = {}) => ({ fullName, phone: "", email: "", ...extra }) as ContactForm;

describe("import status", () => {
  it("marks a re-import of the same address-book entry as added", () => {
    expect(importStatus(dc("7", "Ayşe", ["0532 000 00 00"]), [saved("Ayşe Y.", { deviceContactId: "7" })]).kind).toBe("added");
  });

  it("marks same name + same number as added", () => {
    expect(importStatus(dc("1", "Ayşe Demir", ["+90 532 000 00 00"]), [saved("ayşe  demir", { phone: "0532 000 0000" })]).kind).toBe("added");
  });

  it("keeps people who share a number separate", () => {
    const s = importStatus(dc("2", "Annem", ["0212 111 11 11"]), [saved("Ev", { phone: "0212 111 11 11" })]);
    expect(s).toEqual({ kind: "sharesNumber", with: "Ev" });
  });

  it("never merges by name alone", () => {
    expect(importStatus(dc("3", "Ali Kaya", ["0533 1"]), [saved("Ali Kaya", { phone: "0544 2" })]).kind).toBe("sameName");
    expect(importStatus(dc("4", "Ali Kaya"), [saved("Ali Kaya")]).kind).toBe("sameName");
  });
});

describe("toContact", () => {
  it("keeps every distinct number and invents no last-contact date", () => {
    const c = toContact(dc("9", "Can", ["0532 111 22 33", "+90 532 111 2233", "0212 000 00 00"]), "2026-11-01");
    expect(c.phone).toBe("0532 111 22 33");
    expect(c.extraPhones).toEqual(["0212 000 00 00"]);
    expect(c.lastContactDate).toBe("");
    expect(c.deviceContactId).toBe("9");
    expect(c.reminderIntervalStart).toBe("2026-11-01");
  });
});

describe("importSelected", () => {
  function store(initial: ContactForm[] = []) {
    let list = [...initial];
    return {
      load: async () => list,
      addMany: async (more: ContactForm[]) => { list = [...list, ...more]; },
      get: () => list,
    };
  }

  it("adds only the selected entries, once, even on a second tap", async () => {
    const db = store();
    const pick = [dc("1", "A", ["0532 000 00 01"]), dc("2", "B", ["0532 000 00 02"])];
    expect(await importSelected(pick, "2026-11-01", db)).toEqual({ added: 2, skipped: 0, failed: 0 });
    expect(await importSelected(pick, "2026-11-01", db)).toEqual({ added: 0, skipped: 2, failed: 0 });
    expect(db.get()).toHaveLength(2);
  });

  it("ignores the same entry selected twice", async () => {
    const db = store();
    await importSelected([dc("1", "A"), dc("1", "A")], "2026-11-01", db);
    expect(db.get()).toHaveLength(1);
  });

  it("reports a failed batch and does not re-add the saved ones on retry", async () => {
    const db = store();
    let calls = 0;
    const flaky = { load: db.load, addMany: async (more: ContactForm[]) => { calls += 1; if (calls === 2) throw new Error("disk"); await db.addMany(more); } };
    const pick = [1, 2, 3].map((i) => dc(String(i), `P${i}`, [`0532 000 00 0${i}`]));
    expect(await importSelected(pick, "2026-11-01", flaky, 1)).toEqual({ added: 2, skipped: 0, failed: 1 });
    expect(await importSelected(pick, "2026-11-01", db, 1)).toEqual({ added: 1, skipped: 2, failed: 0 });
    expect(db.get()).toHaveLength(3);
  });
});
