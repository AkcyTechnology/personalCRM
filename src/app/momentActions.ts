import type { ContactForm, InteractionType } from "../screens/AddContactScreen";
import { loadContacts, markContacted, updateContact } from "../data/contacts";
import { showToast, showUndoToast } from "../components/Toast";
import { celebrate } from "../components/Celebration";
import { hapticSuccess } from "../utils/haptics";
import { weeklyStreak } from "../utils/engagement";
import { t } from "../i18n";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
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
    const before = weeklyStreak(await loadContacts());
    const saved = await markContacted(contact.id, type, note, date);
    const after = weeklyStreak(await loadContacts());
    hapticSuccess();
    const name = firstName(contact.fullName);
    celebrate(
      t("{name} ile bağın güçlendi 🌱", { name }),
      after.current > before.current ? t("{count} haftalık seri 🔥", { count: after.current }) : undefined
    );
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
