import { Platform } from "react-native";
import { t } from "../i18n";

type LA = typeof import("expo-local-authentication");

function getModule(): LA | null {
  if (Platform.OS === "web") return null;
  try {
    return require("expo-local-authentication") as LA;
  } catch {
    return null;
  }
}

/** True when the device has Face ID / fingerprint or at least a passcode set. */
export async function canUseAppLockAsync(): Promise<boolean> {
  const LA = getModule();
  if (!LA) return false;
  try {
    const level = await LA.getEnrolledLevelAsync();
    return level !== LA.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function authenticateAsync(reason?: string): Promise<boolean> {
  const LA = getModule();
  if (!LA) return true;
  try {
    const result = await LA.authenticateAsync({
      promptMessage: reason ?? t("Connectly'nin kilidini aç"),
      cancelLabel: t("Vazgeç"),
      fallbackLabel: t("Cihaz şifresini kullan"),
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
