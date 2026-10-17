import AsyncStorage from "@react-native-async-storage/async-storage";

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
};

export async function loadSettings(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}
