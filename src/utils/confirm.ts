import { Alert, Platform } from "react-native";

type Choice = { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void };

/**
 * Cross-platform confirm. react-native-web's Alert.alert is a no-op, so on web
 * this falls back to window.confirm (first non-cancel button = OK).
 */
export function confirmDialog(title: string, message: string | undefined, buttons: Choice[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  const actions = buttons.filter((b) => b.style !== "cancel");
  if (actions.length === 0) {
    window.alert([title, message].filter(Boolean).join("\n\n"));
    return;
  }
  // Web: walk through the non-cancel options one by one (e.g. "Birleştir" / "Değiştir").
  for (const action of actions) {
    if (window.confirm(`${[title, message].filter(Boolean).join("\n\n")}\n\n→ ${action.text}?`)) {
      action.onPress?.();
      return;
    }
  }
}

export function infoDialog(title: string, message?: string) {
  if (Platform.OS === "web") window.alert([title, message].filter(Boolean).join("\n\n"));
  else Alert.alert(title, message);
}
