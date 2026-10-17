import { Platform } from "react-native";

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

export async function authenticateAsync(reason = "Connectly'nin kilidini aç"): Promise<boolean> {
  const LA = getModule();
  if (!LA) return true;
  try {
    const result = await LA.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Vazgeç",
      fallbackLabel: "Cihaz şifresini kullan",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
