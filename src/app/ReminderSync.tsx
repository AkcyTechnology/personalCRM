import { useEffect } from "react";
import { AppState } from "react-native";
import { completeReminder, getContact, loadContacts, markContacted, snoozeContact, snoozeReminder, subscribeContacts } from "../data/contacts";
import { loadSettings, subscribeSettings } from "../data/userSettings";
import {
  ACTION_CONTACTED,
  ACTION_DONE,
  ACTION_SNOOZE,
  getNotificationsModule,
  setupNotificationsAsync,
  syncRemindersAsync,
} from "../utils/notifications";
import { navigationRef } from "../navigation/navigationRef";
import { addDays, toISODate } from "../utils/dates";
import { showToast } from "../components/Toast";
import { track } from "../utils/analytics";
import { t } from "../i18n";

async function resyncNow() {
  const [contacts, settings] = await Promise.all([loadContacts(), loadSettings()]);
  await syncRemindersAsync(contacts, settings);
}

// Bursts of writes (bulk import, undo) re-plan once instead of N times.
let resyncTimer: ReturnType<typeof setTimeout> | null = null;
function resync() {
  if (resyncTimer) clearTimeout(resyncTimer);
  resyncTimer = setTimeout(() => {
    resyncTimer = null;
    resyncNow();
  }, 600);
}

/**
 * Opens the person a notification is about. On a cold start (or behind the
 * app lock) navigation isn't ready yet, so it retries for a few seconds.
 * A contact deleted since the notification was planned is simply ignored.
 */
async function openContact(contactId: string, tries = 0) {
  const contact = await getContact(contactId);
  if (!contact) return;
  if (navigationRef.isReady()) {
    navigationRef.navigate("PersonDetail", { contact });
    return;
  }
  if (tries < 40) setTimeout(() => openContact(contactId, tries + 1), 250);
}

/**
 * Keeps scheduled local notifications in step with the data: re-plans after
 * every contact or settings write and whenever the app comes to the
 * foreground, and handles taps / "Görüştüm" / "Yarın hatırlat" actions.
 */
export default function ReminderSync() {
  useEffect(() => {
    setupNotificationsAsync().then(resyncNow);

    const unsubContacts = subscribeContacts(() => { resync(); });
    const unsubSettings = subscribeSettings(() => { resync(); });
    const appState = AppState.addEventListener("change", (s) => {
      if (s === "active") resync();
    });

    const N = getNotificationsModule();
    const handle = async (response: import("expo-notifications").NotificationResponse) => {
      const data = response.notification.request.content.data as { contactId?: string; reminderId?: string; kind?: string } | undefined;
      const contactId = data?.contactId;
      const reminderId = data?.reminderId;
      if (data?.kind === "dated" && contactId && reminderId) {
        track("reminder_opened", { action: response.actionIdentifier === ACTION_DONE ? "done" : response.actionIdentifier === ACTION_SNOOZE ? "snooze" : "open" });
        if (response.actionIdentifier === ACTION_DONE) await completeReminder(contactId, reminderId);
        else if (response.actionIdentifier === ACTION_SNOOZE) await snoozeReminder(contactId, reminderId, 1);
        else await openContact(contactId);
        return;
      }
      track("reminder_opened", { action: response.actionIdentifier === ACTION_CONTACTED ? "contacted" : response.actionIdentifier === ACTION_SNOOZE ? "snooze" : "open" });
      if (response.actionIdentifier === ACTION_CONTACTED && contactId) {
        await markContacted(contactId, "other");
        showToast(t("Görüşme kaydedildi"));
      } else if (response.actionIdentifier === ACTION_SNOOZE && contactId) {
        await snoozeContact(contactId, toISODate(addDays(new Date(), 1)));
      } else if (contactId) {
        await openContact(contactId);
      }
    };
    const responseSub = N?.addNotificationResponseReceivedListener(handle);
    // Uygulama kapalıyken bildirime dokunulduysa
    N?.getLastNotificationResponseAsync?.().then((r) => {
      if (r) {
        handle(r);
        N.clearLastNotificationResponseAsync?.();
      }
    }).catch(() => {});

    return () => {
      unsubContacts();
      unsubSettings();
      appState.remove();
      responseSub?.remove();
    };
  }, []);

  return null;
}
