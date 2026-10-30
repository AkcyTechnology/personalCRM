import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { loadSettings, subscribeSettings } from "../data/userSettings";
import { getLanguage } from "../i18n";

/**
 * Anonymous product analytics, opt-in only.
 *
 * What is sent: the event name below, a few coarse properties (platform,
 * language, app version, buckets like "2-5"), and a random install id that is
 * not tied to the user, the phone number or any contact. Never sent: names,
 * notes, phone numbers, dates of interactions or anything else from a contact.
 *
 * Events go to PostHog (EU region by default) only when
 * EXPO_PUBLIC_POSTHOG_KEY is set at build time AND the user said yes.
 * Person profiles and GeoIP are disabled per event; also turn on
 * "Discard client IP data" in the PostHog project settings.
 */
export type AnalyticsEvent =
  | "app_open"
  | "onboarding_completed"
  | "contact_added"
  | "contacts_imported"
  | "moment_logged"
  | "tree_stage_up"
  | "streak_extended"
  | "spark_opened"
  | "shuffle_swipe"
  | "story_shared"
  | "reminder_opened";

type Props = Record<string, string | number | boolean>;

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const HOST = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com").replace(/\/$/, "");
const ID_KEY = "crm_anon_install_id";
const FLUSH_MS = 30_000;
const MAX_QUEUE = 200;

let consent = false;
let anonId: string | null = null;
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** True when this build can send analytics at all (a key was configured, not web). */
export function analyticsAvailable(): boolean {
  return !!KEY && Platform.OS !== "web";
}

loadSettings()
  .then((s) => {
    consent = s.analytics === true;
    track("app_open");
  })
  .catch(() => {});
subscribeSettings((s) => {
  consent = s.analytics === true;
  if (!consent) queue = [];
});

async function installId(): Promise<string> {
  if (anonId) return anonId;
  const stored = await AsyncStorage.getItem(ID_KEY).catch(() => null);
  if (stored) return (anonId = stored);
  const Crypto = require("expo-crypto") as typeof import("expo-crypto");
  anonId = Crypto.randomUUID();
  await AsyncStorage.setItem(ID_KEY, anonId).catch(() => {});
  return anonId;
}

/** Turns a count into a coarse bucket so exact numbers never leave the phone. */
export function bucket(n: number): string {
  if (n <= 0) return "0";
  if (n === 1) return "1";
  if (n <= 5) return "2-5";
  if (n <= 20) return "6-20";
  if (n <= 100) return "21-100";
  return "100+";
}

type Queued = { event: string; properties: Props; timestamp: string };

/** The exact payload sent to PostHog: anonymous, personless, no GeoIP. */
export function buildBatch(events: Queued[], distinctId: string) {
  const common: Props = {
    distinct_id: distinctId,
    $process_person_profile: false,
    $geoip_disable: true,
    platform: Platform.OS,
    language: getLanguage(),
    app_version: Constants.expoConfig?.version ?? "unknown",
  };
  return {
    api_key: KEY,
    // Event properties can't override the privacy flags above.
    batch: events.map((e) => ({ event: e.event, timestamp: e.timestamp, properties: { ...e.properties, ...common } })),
  };
}

export function track(event: AnalyticsEvent, properties: Props = {}) {
  if (!consent || !analyticsAvailable()) return;
  queue.push({ event, properties, timestamp: new Date().toISOString() });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (!timer) timer = setTimeout(() => void flush(), FLUSH_MS);
}

export async function flush(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!consent || !analyticsAvailable() || queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    const res = await fetch(`${HOST}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBatch(batch, await installId())),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    // Offline or blocked: keep the events for the next try, bounded.
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
  }
}

/** Forget the install id (after "Delete all data"). */
export function resetAnalytics() {
  anonId = null;
  queue = [];
}

AppState.addEventListener("change", (state) => {
  if (state === "background") void flush();
  if (state === "active") track("app_open");
});
