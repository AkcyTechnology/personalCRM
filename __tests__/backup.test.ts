import AsyncStorage from "@react-native-async-storage/async-storage";
import { addContact, loadContacts } from "../src/data/contacts";
import { buildBackup, restoreBackupAsync, wipeAllDataAsync } from "../src/data/backup";
import { loadSettings, updateSettings } from "../src/data/userSettings";
import type { ContactForm } from "../src/screens/AddContactScreen";

jest.mock("../src/components/Toast", () => ({ showToast: jest.fn() }));
jest.mock("../src/utils/notifications", () => ({ cancelAllRemindersAsync: jest.fn(async () => {}) }));

const person = (fullName: string, extra: Partial<ContactForm> = {}): ContactForm => ({
  fullName, company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "", phone: "", email: "",
  website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "", reminderFreq: "",
  notes: "", ...extra,
});

beforeEach(async () => { await AsyncStorage.clear(); });

describe("backup", () => {
  it("does not export the app-lock setting", async () => {
    await updateSettings({ appLockEnabled: true, userName: "Test" });
    const backup = await buildBackup();
    expect(backup.settings).not.toHaveProperty("appLockEnabled");
    expect(backup.settings?.userName).toBe("Test");
  });

  it("merge skips duplicates, replace overwrites", async () => {
    await addContact(person("Can", { phone: "0532 000 00 01" }));
    const backup = await buildBackup();
    backup.contacts.push(person("Deniz"));

    expect(await restoreBackupAsync(backup, "merge")).toBe(1);
    expect((await loadContacts()).map((c) => c.fullName).sort()).toEqual(["Can", "Deniz"]);

    expect(await restoreBackupAsync({ ...backup, contacts: [person("Ece")] }, "replace")).toBe(1);
    const after = await loadContacts();
    expect(after.map((c) => c.fullName)).toEqual(["Ece"]);
    expect(after[0].id).toBeTruthy();
  });

  it("replace keeps the device's own app-lock choice", async () => {
    await updateSettings({ appLockEnabled: true });
    await restoreBackupAsync({ format: "connectly-backup", version: 1, exportedAt: "", contacts: [], settings: { userName: "X" } }, "replace");
    expect((await loadSettings()).appLockEnabled).toBe(true);
  });

  it("wipe removes every stored key", async () => {
    await addContact(person("Can"));
    await updateSettings({ userName: "Test", appLockEnabled: true });
    await wipeAllDataAsync();
    expect(await loadContacts()).toEqual([]);
    const s = await loadSettings();
    expect(s.userName).toBe("");
    expect(s.appLockEnabled).toBe(false);
    expect(s.onboardingComplete).toBe(false);
  });
});
