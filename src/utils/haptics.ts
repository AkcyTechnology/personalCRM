import { Platform } from "react-native";
import { loadSettings, subscribeSettings } from "../data/userSettings";

type H = typeof import("expo-haptics");

// Follows the "Titreşim" switch in Profile.
let enabled = true;
loadSettings().then((s) => { enabled = s.haptics !== false; }).catch(() => {});
subscribeSettings((s) => { enabled = s.haptics !== false; });

function mod(): H | null {
  if (!enabled || Platform.OS === "web") return null;
  try {
    return require("expo-haptics") as H;
  } catch {
    return null;
  }
}

/** Light confirmation tick for completed actions (e.g. "Görüştüm", a new tree stage). */
export function hapticSuccess() {
  const H = mod();
  H?.notificationAsync(H.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticWarning() {
  const H = mod();
  H?.notificationAsync(H.NotificationFeedbackType.Warning).catch(() => {});
}

/** Selection tick: chips, tabs, a card crossing the swipe threshold. */
export function hapticTap() {
  const H = mod();
  H?.selectionAsync().catch(() => {});
}

/** Soft bump for primary buttons. */
export function hapticImpact() {
  const H = mod();
  H?.impactAsync(H.ImpactFeedbackStyle.Light).catch(() => {});
}
