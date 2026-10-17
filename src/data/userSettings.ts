import { secureGetItem, secureSetItem } from "../storage/secureStorage";

const KEY = "crm_user_settings";

export type UserSettings = {
  reachOutThresholdDays: number;
  userName: string;
  email: string;
  phone?: string;
  city?: string;
  defaultContactIntervalDays?: number;
  language: "tr" | "en" | "es" | "de";
  onboardingComplete: boolean;
  goals: string[];
  notif_birthday: boolean;
  notif_followUp: boolean;
  notif_weeklySummary: boolean;
  notif_smartNudge: boolean;
  /** Require Face ID / fingerprint / device passcode to open the app. */
  appLockEnabled: boolean;
  acceptedTermsAt?: string;
};

const DEFAULTS: UserSettings = {
  reachOutThresholdDays: 14,
  userName: "",
  email: "",
  language: "tr",
  onboardingComplete: false,
  goals: [],
  notif_birthday: true,
  notif_followUp: true,
  notif_weeklySummary: false,
  notif_smartNudge: true,
  appLockEnabled: false,
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
    return { ...DEFAULTS, ...JSON.parse(raw) };
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
