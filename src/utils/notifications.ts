import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as ExpoNotifications from "expo-notifications";

/**
 * True when running inside Expo Go. `expo-notifications` throws on import
 * on Android in Expo Go (SDK 53+ removed remote push support there), so this
 * app must never statically `import` that module — it is lazily `require`d
 * via {@link getNotificationsModule} only when this is false.
 */
export const isExpoGo = isRunningInExpoGo();

let cachedModule: typeof ExpoNotifications | null = null;

/**
 * Lazily loads expo-notifications. Must never be called (and its result
 * never imported at module scope) while running in Expo Go — merely
 * importing the package throws on Android there.
 */
function getNotificationsModule(): typeof ExpoNotifications {
  if (!cachedModule) {
    cachedModule = require("expo-notifications") as typeof ExpoNotifications;
  }
  return cachedModule;
}

/**
 * Requests local notification permission. Never throws.
 *
 * Note: merely `require`-ing expo-notifications throws on Android in Expo Go
 * (its DevicePushTokenAutoRegistration side-effect module registers a push
 * token listener at import time, unconditionally), so this is a no-op there
 * even though local notifications alone don't need remote push.
 */
export async function ensureNotificationPermissionAsync(): Promise<boolean> {
  if (isExpoGo) {
    console.log("expo-notifications is unavailable in Expo Go on Android; skipping permission request.");
    return false;
  }

  try {
    const Notifications = getNotificationsModule();
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.warn("Notification permission request failed:", error);
    return false;
  }
}

/**
 * Registers the device for remote push notifications and returns the Expo push
 * token. Remote push is unsupported in Expo Go since SDK 53, so this is a no-op
 * there. Safe to call from anywhere; never throws and never blocks app startup.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo) {
    console.log("Remote push notifications are disabled in Expo Go.");
    return null;
  }

  try {
    const Notifications = getNotificationsModule();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return token ?? null;
  } catch (error) {
    console.warn("Push notification registration failed:", error);
    return null;
  }
}
