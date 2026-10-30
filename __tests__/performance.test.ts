import { decryptWithKey, encryptWithKey } from "../src/storage/secureStorage";
import { monthlyStory, onThisDay, personOfTheDay, todaysSparks, treeState, weeklyStreak } from "../src/utils/engagement";
import { averageHealthScore } from "../src/utils/healthScore";
import { planReminders } from "../src/utils/reminderPlan";
import type { ContactForm } from "../src/screens/AddContactScreen";

/**
 * A heavy user: 2,000 people with 20 moments each (40,000 moments, ~4 MB JSON).
 * Budgets are generous (CI machines vary); they exist to catch accidental
 * quadratic work, not to benchmark. Real-device (Hermes) numbers still need
 * measuring on a phone.
 */
const N = 2000;
const now = new Date(2026, 9, 30);
const iso = (d: Date) => d.toISOString().slice(0, 10);

const contacts: ContactForm[] = Array.from({ length: N }, (_, i) => ({
  id: `c${i}`, fullName: `Kişi ${i}`, company: "", jobTitle: "", birthday: `${String((i % 28) + 1).padStart(2, "0")}/${String((i % 12) + 1).padStart(2, "0")}/1990`,
  relationship: ["Aile", "Arkadaş", "İş", "Mentor"][i % 4], metWhere: "", phone: "", email: "", website: "", instagram: "", city: "",
  socials: [], tags: "", priority: "", lastContactDate: iso(new Date(now.getTime() - (i % 200) * 86400000)), reminderFreq: "",
  notes: "Uzun bir not ".repeat(10),
  interactions: Array.from({ length: 20 }, (_, k) => ({ id: `${i}-${k}`, type: "call" as const, date: iso(new Date(now.getTime() - ((i % 200) + k * 17) * 86400000)), note: "Kahve içtik, işten konuştuk" })),
}));

function time(fn: () => unknown, label?: string): number {
  const t0 = performance.now();
  fn();
  const ms = performance.now() - t0;
  if (label && process.env.PERF_LOG) console.log(`${label}: ${ms.toFixed(0)} ms`);
  return ms;
}

describe("performance with 2,000 contacts / 40,000 moments", () => {
  it("computes the whole Home screen in well under a second", () => {
    const ms = time(() => {
      weeklyStreak(contacts, now);
      treeState(contacts, now);
      todaysSparks(contacts, 14, now);
      personOfTheDay(contacts, 14, now);
      onThisDay(contacts, now);
      averageHealthScore(contacts, 14);
    }, "home");
    expect(ms).toBeLessThan(1500);
  });

  it("builds the monthly story and the reminder plan quickly", () => {
    expect(time(() => monthlyStory(contacts, now), "story")).toBeLessThan(800);
    expect(time(() => planReminders(contacts, { reachOutThresholdDays: 14, notif_birthday: true, notif_followUp: true, notif_weeklySummary: true, notif_smartNudge: true }, now), "reminders")).toBeLessThan(1500);
  });

  it("encrypts and decrypts the full data set", () => {
    const json = JSON.stringify(contacts);
    const key = new Uint8Array(32).fill(3);
    const nonce = new Uint8Array(24).fill(9);
    let sealed = "";
    const enc = time(() => { sealed = encryptWithKey(key, json, nonce); }, "encrypt");
    const dec = time(() => { decryptWithKey(key, sealed); }, "decrypt");
    expect(json.length).toBeGreaterThan(3_000_000);
    expect(enc + dec).toBeLessThan(3000);
  });
});
