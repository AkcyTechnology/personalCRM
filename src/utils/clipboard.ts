import { Platform } from "react-native";
import * as Clipboard from "expo-clipboard";

const CLIPBOARD_CLEAR_MS = 90_000;
let clipboardTimer: ReturnType<typeof setTimeout> | null = null;

/** Copies text and wipes it from the clipboard after 90 s (other apps can read it). */
export async function copyWithAutoClear(text: string) {
  await Clipboard.setStringAsync(text);
  if (clipboardTimer) clearTimeout(clipboardTimer);
  clipboardTimer = setTimeout(async () => {
    clipboardTimer = null;
    try {
      // iOS'ta panoyu okumak "yapıştır" izni sorar; orada doğrudan temizlenir.
      if (Platform.OS === "ios" || (await Clipboard.getStringAsync()) === text) {
        await Clipboard.setStringAsync("");
      }
    } catch {}
  }, CLIPBOARD_CLEAR_MS);
}
