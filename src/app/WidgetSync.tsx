import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { loadContacts, subscribeContacts } from "../data/contacts";
import { loadSettings, subscribeSettings } from "../data/userSettings";
import { peopleThisWeek, personOfTheDay, reasonFor, treeState, TREE_STAGES } from "../utils/engagement";
import { reasonText } from "../screens/ShuffleScreen";
import { colorScheme } from "../theme/colors";
import { updateWidget } from "../widgets";
import { t } from "../i18n";

const STAGE_EMOJI = ["🌰", "🌱", "🌿", "🌳", "🌳", "🌸"];

async function refresh() {
  const [contacts, s] = await Promise.all([loadContacts(), loadSettings()]);
  const tree = treeState(contacts);
  const pod = personOfTheDay(contacts, s.reachOutThresholdDays || 14);
  // With app lock on, the home screen must not reveal who is in the app.
  const showName = !!pod && !s.appLockEnabled;
  const first = pod ? pod.fullName.trim().split(/\s+/)[0] : "";
  updateWidget({
    title: t("Bağ ağacın"),
    stage: t(TREE_STAGES[tree.stage].name),
    emoji: STAGE_EMOJI[tree.stage],
    week: t("Bu hafta {done} / {goal} kişi", { done: peopleThisWeek(contacts), goal: s.weeklyGoal || 3 }),
    person: showName ? first : "",
    prompt: showName ? reasonText(reasonFor(pod), first) : t("Bugün kime merhaba diyeceksin?"),
    dark: colorScheme() === "dark",
  });
}

/** Keeps the iOS home-screen widget in step with the data. Renders nothing. */
export default function WidgetSync() {
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const run = () => { refresh().catch(() => {}); };
    run();
    const unsubContacts = subscribeContacts(run);
    const unsubSettings = subscribeSettings(run);
    const sub = AppState.addEventListener("change", (state) => { if (state === "background") run(); });
    return () => {
      unsubContacts();
      unsubSettings();
      sub.remove();
    };
  }, []);
  return null;
}
