import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "crm_user_settings";

export type UserSettings = {
  reachOutThresholdDays: number; // kaç gün sonra "ulaş" listesine girer
};

const DEFAULTS: UserSettings = {
  reachOutThresholdDays: 14,
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
