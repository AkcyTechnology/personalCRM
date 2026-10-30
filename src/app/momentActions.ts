import type { ContactForm, InteractionType } from "../screens/AddContactScreen";
import { loadContacts, markContacted, updateContact } from "../data/contacts";
import { showToast, showUndoToast } from "../components/Toast";
import { celebrate } from "../components/Celebration";
import { hapticSuccess } from "../utils/haptics";
import { peopleThisWeek, treeState, TREE_STAGES, weeklyStreak } from "../utils/engagement";
import { markGlow } from "./glow";
import { bucket, track } from "../utils/analytics";
import { t } from "../i18n";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * A small, varying line under the celebration so logging a moment doesn't feel
 * the same every time.
 */
function surprise(thisWeek: number, toNext: number): string {
  const lines = [
    t("Ağacına yeni bir yaprak eklendi 🍃"),
    thisWeek > 1 ? t("Bu hafta {count} kişiyle bağ kurdun", { count: thisWeek }) : t("Bugün birinin gününü güzelleştirdin ☀️"),
    toNext > 0 && toNext <= 3 ? t("{count} an daha ve ağacın büyüyecek", { count: toNext }) : t("Küçük anlar, büyük bağlar 💛"),
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

/**
 * The one "Görüştüm" flow every screen uses: record the moment, celebrate it,
 * and offer undo. Returns the saved contact (or undefined on failure).
 */
export async function logMoment(
  contact: ContactForm,
  type: InteractionType,
  note: string,
  date: string,
  onChange?: (saved: ContactForm | undefined) => void
): Promise<ContactForm | undefined> {
  if (!contact.id) return undefined;
  const snapshot = {
    interactions: contact.interactions,
    lastContactDate: contact.lastContactDate,
    reminderIntervalStart: contact.reminderIntervalStart,
    snoozedUntil: contact.snoozedUntil,
  };
  try {
    const beforeContacts = await loadContacts();
    const before = weeklyStreak(beforeContacts);
    const treeBefore = treeState(beforeContacts);
    markGlow(contact.id); // before saving, so an open Universe sees it with the update
    const saved = await markContacted(contact.id, type, note, date);
    const afterContacts = await loadContacts();
    const after = weeklyStreak(afterContacts);
    const treeAfter = treeState(afterContacts);
    hapticSuccess();
    track("moment_logged", { type });
    if (treeAfter.stage > treeBefore.stage) track("tree_stage_up", { stage: treeAfter.stage });
    if (after.current > before.current) track("streak_extended", { weeks: bucket(after.current) });
    const name = firstName(contact.fullName);
    if (treeAfter.stage > treeBefore.stage) {
      celebrate(t("Ağacın büyüdü: {stage} 🌳", { stage: t(TREE_STAGES[treeAfter.stage].name) }), t("{name} ile bağın güçlendi 🌱", { name }));
    } else {
      celebrate(
        t("{name} ile bağın güçlendi 🌱", { name }),
        after.current > before.current
          ? t("{count} haftalık seri 🔥", { count: after.current })
          : surprise(peopleThisWeek(afterContacts), treeAfter.toNext)
      );
    }
    onChange?.(saved);
    setTimeout(() => {
      showUndoToast(t("Görüşme kaydedildi"), async () => {
        const restored = await updateContact(contact.id!, snapshot);
        onChange?.(restored);
      });
    }, 1600);
    return saved;
  } catch {
    showToast(t("Kaydedilemedi. Lütfen tekrar dene."));
    return undefined;
  }
}
