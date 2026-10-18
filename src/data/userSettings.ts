import { secureGetItem, secureSetItem } from "../storage/secureStorage";

const KEY = "crm_user_settings";

export type UserSettings = {
  reachOutThresholdDays: number;
  userName: string;
  email: string;
  phone?: string;
  city?: string;
  defaultContactIntervalDays?: number;
  /** "system" follows the phone language. */
  language: "system" | "tr" | "en";
  onboardingComplete: boolean;
  goals: string[];
  notif_birthday: boolean;
  notif_followUp: boolean;
  notif_weeklySummary: boolean;
  notif_smartNudge: boolean;
  /** Require Face ID / fingerprint / device passcode to open the app. */
  appLockEnabled: boolean;
  acceptedTermsAt?: string;
  /** Distinct people to connect with per week (weekly ring). */
  weeklyGoal: number;
};

const DEFAULTS: UserSettings = {
  reachOutThresholdDays: 14,
  userName: "",
  email: "",
  language: "system",
  onboardingComplete: false,
  goals: [],
  notif_birthday: true,
  notif_followUp: true,
  notif_weeklySummary: false,
  notif_smartNudge: true,
  appLockEnabled: false,
  weeklyGoal: 3,
};

type Listener = (settings: UserSettings) => void;
const listeners = new Set<Listener>();

export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadSettings(): Promise<UserSettings> {
  try {
    const raw = await secureGetItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as UserSettings;
    // Eski sürümlerde dil seçimi işlevsizdi (es/de); sistem diline dön.
    if (!["system", "tr", "en"].includes(parsed.language)) parsed.language = "system";
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await secureSetItem(KEY, JSON.stringify(settings));
    listeners.forEach((l) => l(settings));
  } catch (error) {
    console.warn("Ayarlar kaydedilemedi:", error);
  }
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const next = { ...(await loadSettings()), ...patch };
  await saveSettings(next);
  return next;
}
