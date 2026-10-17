import { useEffect } from "react";
import { AppState } from "react-native";
import { getContact, loadContacts, markContacted, snoozeContact, subscribeContacts } from "../data/contacts";
import { loadSettings, subscribeSettings } from "../data/userSettings";
import {
  ACTION_CONTACTED,
  ACTION_SNOOZE,
  getNotificationsModule,
  setupNotificationsAsync,
  syncRemindersAsync,
} from "../utils/notifications";
import { navigationRef } from "../navigation/navigationRef";
import { addDays, toISODate } from "../utils/dates";
import { showToast } from "../components/Toast";

async function resync() {
  const [contacts, settings] = await Promise.all([loadContacts(), loadSettings()]);
  await syncRemindersAsync(contacts, settings);
}

async function openContact(contactId: string) {
  const contact = await getContact(contactId);
  if (!contact) return;
  const go = () => navigationRef.navigate("PersonDetail", { contact });
  if (navigationRef.isReady()) go();
  else setTimeout(go, 800);
}

/**
 * Keeps scheduled local notifications in step with the data: re-plans after
 * every contact or settings write and whenever the app comes to the
 * foreground, and handles taps / "Görüştüm" / "Yarın hatırlat" actions.
 */
export default function ReminderSync() {
  useEffect(() => {
    setupNotificationsAsync().then(resync);

    const unsubContacts = subscribeContacts(() => { resync(); });
    const unsubSettings = subscribeSettings(() => { resync(); });
    const appState = AppState.addEventListener("change", (s) => {
      if (s === "active") resync();
    });

    const N = getNotificationsModule();
    const handle = async (response: import("expo-notifications").NotificationResponse) => {
      const data = response.notification.request.content.data as { contactId?: string } | undefined;
      const contactId = data?.contactId;
      if (response.actionIdentifier === ACTION_CONTACTED && contactId) {
        await markContacted(contactId, "other");
        showToast("Görüşme kaydedildi");
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
