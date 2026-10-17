import { Platform } from "react-native";

type H = typeof import("expo-haptics");

function mod(): H | null {
  if (Platform.OS === "web") return null;
  try {
    return require("expo-haptics") as H;
  } catch {
    return null;
  }
}

/** Light confirmation tick for completed actions (e.g. "Görüştüm"). */
export function hapticSuccess() {
  const H = mod();
  H?.notificationAsync(H.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticWarning() {
  const H = mod();
  H?.notificationAsync(H.NotificationFeedbackType.Warning).catch(() => {});
}

export function hapticTap() {
  const H = mod();
  H?.selectionAsync().catch(() => {});
}
