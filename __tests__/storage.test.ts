import AsyncStorage from "@react-native-async-storage/async-storage";
import { decryptWithKey, encryptWithKey, isEncrypted, secureGetItem, secureSetItem } from "../src/storage/secureStorage";
import { addContact, deleteContact, loadContacts, markContacted, updateContact } from "../src/data/contacts";
import { parseBackup } from "../src/data/backup";
import type { ContactForm } from "../src/screens/AddContactScreen";

jest.mock("../src/components/Toast", () => ({ showToast: jest.fn() }));

const person = (fullName: string, extra: Partial<ContactForm> = {}): ContactForm => ({
  fullName, company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "", phone: "", email: "",
  website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "", reminderFreq: "",
  notes: "", ...extra,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("encryption", () => {
  const key = new Uint8Array(32).fill(7);
  const nonce = new Uint8Array(24).fill(1);

  it("round-trips and detects tampering", () => {
    const sealed = encryptWithKey(key, "gizli not ğüşıöç", nonce);
    expect(isEncrypted(sealed)).toBe(true);
    expect(sealed).not.toContain("gizli");
    expect(decryptWithKey(key, sealed)).toBe("gizli not ğüşıöç");
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("00") ? "11" : "00");
    expect(() => decryptWithKey(key, tampered)).toThrow();
  });

  it("stores values encrypted at rest and migrates legacy plain text", async () => {
    await secureSetItem("k", "merhaba");
    expect(await AsyncStorage.getItem("k")).toMatch(/^enc1:/);
    expect(await secureGetItem("k")).toBe("merhaba");

    await AsyncStorage.setItem("legacy", '{"a":1}');
    expect(await secureGetItem("legacy")).toBe('{"a":1}');
    expect(await AsyncStorage.getItem("legacy")).toMatch(/^enc1:/);
  });
});

describe("contacts", () => {
  it("starts empty — no demo data", async () => {
    expect(await loadContacts()).toEqual([]);
  });

  it("only touches the targeted contact even with identical names", async () => {
    await addContact(person("Ahmet Yılmaz", { notes: "1" }));
    await addContact(person("Ahmet Yılmaz", { notes: "2" }));
    const [a, b] = await loadContacts();

    await updateContact(a.id!, { notes: "güncel" });
    let all = await loadContacts();
    expect(all.find((c) => c.id === a.id)!.notes).toBe("güncel");
    expect(all.find((c) => c.id === b.id)!.notes).toBe("2");

    await deleteContact(a.id!);
    all = await loadContacts();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
  });

  it("markContacted logs history and resets the reminder", async () => {
    await addContact(person("Seda", { lastContactDate: "2026-01-01", snoozedUntil: "2099-01-01" }));
    const [c] = await loadContacts();
    const saved = (await markContacted(c.id!, "call", "Kahve içtik", "2026-10-15"))!;
    expect(saved.lastContactDate).toBe("2026-10-15");
    expect(saved.snoozedUntil).toBeUndefined();
    expect(saved.interactions).toHaveLength(1);
    expect(saved.interactions![0]).toMatchObject({ type: "call", note: "Kahve içtik", date: "2026-10-15" });
  });
});

describe("parseBackup", () => {
  it("accepts valid backups and drops malformed rows", () => {
    const backup = parseBackup(
      JSON.stringify({
        format: "connectly-backup",
        version: 1,
        exportedAt: "x",
        contacts: [person("Can"), { fullName: "" }, null, "x", { notes: "isimsiz" }],
      })
    );
    expect(backup.contacts.map((c) => c.fullName)).toEqual(["Can"]);
  });

  it("rejects foreign files", () => {
    expect(() => parseBackup("not json")).toThrow();
    expect(() => parseBackup(JSON.stringify({ contacts: [] }))).toThrow();
    expect(() => parseBackup(JSON.stringify({ format: "connectly-backup", version: 99, contacts: [] }))).toThrow();
  });
});
