import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import type * as ExpoNotifications from "expo-notifications";
import type { ContactForm } from "../screens/AddContactScreen";
import type { UserSettings } from "../data/userSettings";
import { planReminders } from "./reminderPlan";
import { getLanguage, t } from "../i18n";

/**
 * True when running inside Expo Go on Android. `expo-notifications` throws on
 * import there (SDK 53+ removed remote push support), so this module must
 * never statically `import` it — it is lazily `require`d via
 * {@link getNotificationsModule} only when this is false. iOS Expo Go still
 * supports local notifications.
 */
export const notificationsUnavailable = isRunningInExpoGo() && Platform.OS === "android";

export const ACTION_CONTACTED = "contacted";
export const ACTION_SNOOZE = "snooze_1d";
export const CATEGORY_FOLLOW_UP = "follow_up";
const CHANNEL_ID = "reminders";

let cachedModule: typeof ExpoNotifications | null = null;

export function getNotificationsModule(): typeof ExpoNotifications | null {
  if (notificationsUnavailable || Platform.OS === "web") return null;
  if (!cachedModule) {
    try {
      cachedModule = require("expo-notifications") as typeof ExpoNotifications;
    } catch (error) {
      console.warn("expo-notifications yüklenemedi:", error);
      return null;
    }
  }
  return cachedModule;
}

let setupLang: string | null = null;

/** Foreground presentation, Android channel and the "Görüştüm" action buttons. */
export async function setupNotificationsAsync(): Promise<void> {
  const N = getNotificationsModule();
  if (!N || setupLang === getLanguage()) return;
  setupLang = getLanguage();
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: t("Hatırlatıcılar"),
        importance: N.AndroidImportance.HIGH,
      });
    }
    await N.setNotificationCategoryAsync(CATEGORY_FOLLOW_UP, [
      { identifier: ACTION_CONTACTED, buttonTitle: t("Görüştüm ✓"), options: { opensAppToForeground: false } },
      { identifier: ACTION_SNOOZE, buttonTitle: t("Yarın hatırlat"), options: { opensAppToForeground: false } },
    ]);
  } catch (error) {
    console.warn("Bildirim kurulumu başarısız:", error);
  }
}

export async function hasNotificationPermissionAsync(): Promise<boolean> {
  const N = getNotificationsModule();
  if (!N) return false;
  try {
    return (await N.getPermissionsAsync()).status === "granted";
  } catch {
    return false;
  }
}

/** Requests local notification permission. Never throws. */
export async function ensureNotificationPermissionAsync(): Promise<boolean> {
  const N = getNotificationsModule();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.status === "granted") return true;
    if (!current.canAskAgain) return false;
    const { status } = await N.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.warn("Notification permission request failed:", error);
    return false;
  }
}

let syncChain: Promise<void> = Promise.resolve();

/**
 * Replaces every scheduled reminder with a fresh plan. Runs serialised so
 * overlapping saves cannot interleave cancel/schedule calls.
 */
export function syncRemindersAsync(contacts: ContactForm[], settings: UserSettings): Promise<void> {
  syncChain = syncChain.then(() => doSync(contacts, settings)).catch((e) => {
    console.warn("Hatırlatıcılar zamanlanamadı:", e);
  });
  return syncChain;
}

async function doSync(contacts: ContactForm[], settings: UserSettings) {
  const N = getNotificationsModule();
  if (!N) return;
  if (!(await hasNotificationPermissionAsync())) return;
  await setupNotificationsAsync();
  await N.cancelAllScheduledNotificationsAsync();

  for (const item of planReminders(contacts, settings)) {
    const content: ExpoNotifications.NotificationContentInput = {
      title: item.title,
      body: item.body,
      data: { kind: item.kind, contactId: "contactId" in item ? item.contactId : undefined },
      categoryIdentifier: item.kind === "followUp" || item.kind === "smartNudge" ? CATEGORY_FOLLOW_UP : undefined,
    };
    const trigger: ExpoNotifications.NotificationTriggerInput =
      item.kind === "weeklySummary"
        ? {
            type: N.SchedulableTriggerInputTypes.WEEKLY,
            weekday: item.weekday,
            hour: item.hour,
            minute: item.minute,
            channelId: CHANNEL_ID,
          }
        : { type: N.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: CHANNEL_ID };
    await N.scheduleNotificationAsync({ content, trigger });
  }
}

export async function cancelAllRemindersAsync(): Promise<void> {
  const N = getNotificationsModule();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {}
}
