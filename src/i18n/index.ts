import { Platform } from "react-native";
import { en } from "./en";

/**
 * Lightweight gettext-style i18n. The Turkish source text is the key, so
 * screens stay readable and a missing English entry falls back to Turkish
 * instead of showing a raw key. `__tests__/i18n.test.ts` fails the build when
 * a t("…") key has no English translation.
 *
 * Plurals: an English entry can be [one, other]; it is chosen by params.count.
 */

export type Lang = "tr" | "en";
export type LanguagePreference = "system" | Lang;

function systemLanguage(): Lang {
  try {
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      return navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
    }
    const Localization = require("expo-localization") as typeof import("expo-localization");
    const code = Localization.getLocales()?.[0]?.languageCode?.toLowerCase();
    return code === "tr" ? "tr" : "en";
  } catch {
    return "tr";
  }
}

let current: Lang = systemLanguage();

export function resolveLanguage(pref: LanguagePreference | string | undefined): Lang {
  if (pref === "tr" || pref === "en") return pref;
  return systemLanguage();
}

export function setLanguage(lang: Lang) {
  current = lang;
}

export function getLanguage(): Lang {
  return current;
}

/** BCP-47 locale for Intl / toLocaleDateString. */
export function locale(): string {
  return current === "en" ? "en-US" : "tr-TR";
}

type Params = Record<string, string | number | undefined>;

export function t(key: string, params?: Params): string {
  let value: string = key;
  if (current === "en") {
    const entry = en[key];
    if (Array.isArray(entry)) value = params?.count === 1 ? entry[0] : entry[1];
    else if (typeof entry === "string") value = entry;
  }
  if (params) value = value.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] === undefined ? "" : String(params[k])));
  return value;
}

/** Translate a stored canonical value (e.g. relationship "Arkadaş") for display. */
export function tv(value: string | undefined): string {
  return value ? t(value) : "";
}
