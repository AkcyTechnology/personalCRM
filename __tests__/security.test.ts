/**
 * Attacker-controlled input: a backup file someone sends you, and strings that
 * end up in links. Each test is an attack that must not work.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseBackup, restoreBackupAsync } from "../src/data/backup";
import { loadContacts } from "../src/data/contacts";
import { loadSettings, updateSettings } from "../src/data/userSettings";
import { decryptBackupText } from "../src/data/backupCrypto";
import { monthlyStory, treeState, weeklyStreak, todaysSparks, personOfTheDay, allMoments } from "../src/utils/engagement";
import { insightFacts, contactRecency } from "../src/utils/insights";
import { badges, recentMoments, weekPlans, dailyPeople } from "../src/utils/homeData";
import { dueContacts, weekStats, recentWeeks } from "../src/utils/stats";
import { filterPeople } from "../src/utils/peopleFilters";
import { helloSuggestions } from "../src/utils/helloSuggestions";
import { socialProfileUrl, toSafeWebUrl, toWhatsAppNumber } from "../src/utils/links";
import { duplicateIds } from "../src/utils/duplicateContact";

jest.mock("../src/components/Toast", () => ({ showToast: jest.fn() }));
jest.mock("../src/utils/notifications", () => ({ cancelAllRemindersAsync: jest.fn(async () => {}) }));

beforeEach(async () => { await AsyncStorage.clear(); });

const file = (contacts: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ format: "connectly-backup", version: 1, exportedAt: "2026-11-01", contacts, ...extra });

/** Every screen's data function, run over the restored contacts: none may throw. */
function renderAll(list: Parameters<typeof monthlyStory>[0]) {
  const now = new Date(2026, 10, 18, 12);
  monthlyStory(list, now);
  treeState(list, now);
  weeklyStreak(list, now);
  todaysSparks(list, 14, now);
  personOfTheDay(list, 14, now);
  allMoments(list);
  insightFacts(list, 3, now);
  contactRecency(list, now);
  badges(list, 3, now);
  recentMoments(list, 5, now);
  weekPlans(list, now);
  dailyPeople(list, now);
  dueContacts(list, 14);
  weekStats(list, 3, now);
  recentWeeks(list, 4, now);
  filterPeople(list, { query: "a", quick: "all", filters: { groups: [], lastContact: [], reminder: [], tags: [], cities: [], companies: [] }, sort: "name", threshold: 14 });
  duplicateIds(list);
  for (const c of list) helloSuggestions(c, now);
}

describe("malicious backup: wrong types must not crash the app (persistent DoS)", () => {
  const evil = {
    id: "x1",
    fullName: "Kötü Niyetli",
    createdAt: 123,
    updatedAt: { a: 1 },
    lastContactDate: "2026-11-xx",
    snoozedUntil: ["2026"],
    reminderEnabled: "yes",
    reminderIntervalStart: 42,
    order: "first",
    birthday: 19900101,
    tags: ["a", "b"],
    interactions: [
      { id: "i1", date: "2026-11-zz", type: "call" },
      { id: "i2", date: "2026-11-03", type: "<script>", note: 7 },
      { id: 5, date: "2026-11-03", type: "call" },
    ],
    reminders: [{ id: "r1", date: "2026-11-20", time: "09:00", note: { x: 1 } }],
  };

  it("cleans every field so all screens still compute", async () => {
    const b = parseBackup(file([evil]));
    await restoreBackupAsync(b, "replace");
    const list = await loadContacts();
    expect(list).toHaveLength(1);
    expect(() => renderAll(list)).not.toThrow();
    const c = list[0];
    expect(typeof c.createdAt === "string" || c.createdAt === undefined).toBe(true);
    expect(c.interactions?.every((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date))).toBe(true);
    expect(c.interactions?.every((i) => ["call", "whatsapp", "email", "meeting", "message", "other"].includes(i.type))).toBe(true);
  });

  it("drops fields the app doesn't know (no mass assignment)", () => {
    const b = parseBackup(file([{ fullName: "A", photoUri: "https://tracker.example/pixel.png", isAdmin: true, ["__proto__"]: { polluted: 1 } }]));
    const c = b.contacts[0] as unknown as Record<string, unknown>;
    expect(c.photoUri).toBeUndefined();
    expect(c.isAdmin).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("caps sizes so a huge file can't freeze the phone", () => {
    const many = Array.from({ length: 50_000 }, (_, i) => ({ id: `i${i}`, date: "2026-01-01", type: "call" }));
    const b = parseBackup(file([{ fullName: "A", interactions: many }]));
    expect(b.contacts[0].interactions!.length).toBeLessThanOrEqual(5000);
  });

  it("gives duplicate or odd ids fresh ones", () => {
    const b = parseBackup(file([{ id: "same", fullName: "A" }, { id: "same", fullName: "B" }, { id: "x".repeat(5000), fullName: "C" }]));
    const ids = b.contacts.map((c) => c.id);
    expect(new Set(ids.filter(Boolean)).size).toBe(ids.filter(Boolean).length);
    expect(ids.every((id) => !id || id.length <= 100)).toBe(true);
  });
});

describe("malicious backup: settings cannot be hijacked", () => {
  it("does not switch analytics on, and keeps every value in range", async () => {
    await updateSettings({ analytics: false, analyticsAsked: false, userName: "Ben" });
    const b = parseBackup(
      file([{ fullName: "A" }], {
        settings: {
          analytics: true,
          analyticsAsked: true,
          appLockEnabled: false,
          weeklyGoal: -5,
          notifyHour: 99,
          reachOutThresholdDays: 1e9,
          theme: "hacker",
          language: "xx",
          userName: { toString: 1 },
          quietStart: "22",
          onboardingComplete: "yes",
          acceptedTermsAt: "2020-01-01",
          injected: "x",
        },
      })
    );
    await restoreBackupAsync(b, "replace");
    const s = (await loadSettings()) as unknown as Record<string, unknown>;
    expect(s.analytics).toBe(false);
    expect(s.weeklyGoal).toBeGreaterThanOrEqual(1);
    expect(s.weeklyGoal).toBeLessThanOrEqual(50);
    expect(s.notifyHour).toBeGreaterThanOrEqual(0);
    expect(s.notifyHour).toBeLessThanOrEqual(23);
    expect(s.reachOutThresholdDays).toBeLessThanOrEqual(365);
    expect(["system", "light", "dark"]).toContain(s.theme);
    expect(["system", "tr", "en"]).toContain(s.language);
    expect(typeof s.userName).toBe("string");
    expect(s.injected).toBeUndefined();
    expect(s.acceptedTermsAt).not.toBe("2020-01-01");
  });
});

describe("malicious encrypted backup", () => {
  it("refuses KDF settings that would take minutes or gigabytes", async () => {
    const evil = JSON.stringify({
      format: "connectly-backup-encrypted", version: 1, cipher: "xchacha20poly1305",
      kdf: { name: "scrypt", N: 2 ** 30, r: 64, p: 64, salt: "00".repeat(16) }, nonce: "00".repeat(24), data: "00".repeat(32),
    });
    await expect(decryptBackupText(evil, "password123")).rejects.toThrow("malformed");
  });
});

describe("links built from contact data", () => {
  it("only opens http(s) web links", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,<b>x</b>", "file:///etc/passwd", "intent://x#Intent;end", "https://a b.com", "http://"]) {
      expect(toSafeWebUrl(bad)).toBeNull();
    }
  });
  it("keeps social handles on their own site", () => {
    expect(socialProfileUrl("instagram", "../../evil")).toBeNull();
    expect(socialProfileUrl("instagram", "user?redirect=evil.com")).toBeNull();
    expect(socialProfileUrl("instagram", "javascript:alert(1)")).toBeNull();
  });
  it("WhatsApp numbers are digits only", () => {
    expect(toWhatsAppNumber("0532 111 22 33&text=phish")).toBe("905321112233");
    expect(toWhatsAppNumber("abc")).toBeNull();
  });
});
