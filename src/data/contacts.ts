import type { ContactForm, Interaction, InteractionType } from "../screens/AddContactScreen";
import { secureGetItem, secureSetItem } from "../storage/secureStorage";
import { todayISO } from "../utils/dates";

const KEY = "crm_contacts";

// ─── Change events ────────────────────────────────────────────────────────────
// Reminder scheduling and open screens listen to these so they stay in sync
// with every write, wherever it happens.

type Listener = (contacts: ContactForm[]) => void;
const listeners = new Set<Listener>();

export function subscribeContacts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(contacts: ContactForm[]) {
  listeners.forEach((l) => {
    try { l(contacts); } catch {}
  });
}

// ─── API ──────────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Reads contacts; throws if stored data exists but cannot be read. */
async function readContacts(): Promise<ContactForm[]> {
  const raw = await secureGetItem(KEY);
  if (raw === null) return [];
  const parsed = JSON.parse(raw) as ContactForm[];
  // Eski kayıtlarda id eksikse (seçim/silme/sıralama için gerekli) tamamla.
  if (parsed.some((c) => !c.id)) {
    const migrated = parsed.map((c) => ({ ...c, id: c.id ?? generateId() }));
    await secureSetItem(KEY, JSON.stringify(migrated));
    return migrated;
  }
  return parsed;
}

export async function loadContacts(): Promise<ContactForm[]> {
  try {
    return await readContacts();
  } catch (error) {
    console.warn("Kişiler okunamadı:", error);
    return [];
  }
}

export async function saveContacts(contacts: ContactForm[]): Promise<void> {
  await secureSetItem(KEY, JSON.stringify(contacts));
  emit(contacts);
}

/** Read-modify-write; a read failure aborts instead of overwriting data. */
async function mutate(fn: (current: ContactForm[]) => ContactForm[]): Promise<ContactForm[]> {
  const updated = fn(await readContacts());
  await saveContacts(updated);
  return updated;
}

export async function addContact(contact: ContactForm): Promise<ContactForm[]> {
  const now = new Date().toISOString();
  const prepared: ContactForm = {
    ...contact,
    id: contact.id ?? generateId(),
    createdAt: contact.createdAt ?? now,
    updatedAt: contact.updatedAt ?? now,
  };
  return mutate((current) => [...current, prepared]);
}

export async function addContacts(contacts: ContactForm[]): Promise<ContactForm[]> {
  const now = new Date().toISOString();
  const prepared = contacts.map((c) => ({
    ...c,
    id: c.id ?? generateId(),
    createdAt: c.createdAt ?? now,
    updatedAt: c.updatedAt ?? now,
  }));
  return mutate((current) => [...current, ...prepared]);
}

/** Updates exactly one contact, matched by id. */
export async function updateContact(
  id: string,
  patch: Partial<ContactForm> | ((c: ContactForm) => Partial<ContactForm>)
): Promise<ContactForm | undefined> {
  let result: ContactForm | undefined;
  await mutate((current) =>
    current.map((c) => {
      if (c.id !== id) return c;
      const changes = typeof patch === "function" ? patch(c) : patch;
      result = { ...c, ...changes, id: c.id, updatedAt: new Date().toISOString() };
      return result;
    })
  );
  return result;
}

export async function deleteContact(id: string): Promise<ContactForm[]> {
  return mutate((current) => current.filter((c) => c.id !== id));
}

export async function deleteContacts(ids: string[]): Promise<ContactForm[]> {
  const idSet = new Set(ids);
  return mutate((current) => current.filter((c) => !c.id || !idSet.has(c.id)));
}

export async function reorderContacts(orderedIds: string[]): Promise<ContactForm[]> {
  const orderIndex = new Map(orderedIds.map((id, i) => [id, i]));
  return mutate((current) =>
    current.map((c) =>
      c.id && orderIndex.has(c.id) ? { ...c, order: orderIndex.get(c.id) } : c
    )
  );
}

export async function snoozeContact(id: string, until: string): Promise<ContactForm | undefined> {
  return updateContact(id, { snoozedUntil: until });
}

/**
 * Records that the user got in touch: appends to the interaction history,
 * moves lastContactDate forward, restarts the reminder interval and clears
 * any snooze.
 */
export async function markContacted(
  id: string,
  type: InteractionType = "other",
  note?: string,
  date: string = todayISO()
): Promise<ContactForm | undefined> {
  return updateContact(id, (c) => {
    const interaction: Interaction = { id: generateId(), date, type, note: note?.trim() || undefined };
    const interactions = [...(c.interactions ?? []), interaction].sort((a, b) => b.date.localeCompare(a.date));
    const newest = interactions[0].date;
    const lastContactDate = !c.lastContactDate || newest > c.lastContactDate ? newest : c.lastContactDate;
    return {
      interactions,
      lastContactDate,
      reminderIntervalStart: undefined,
      snoozedUntil: undefined,
    };
  });
}

export async function deleteInteraction(contactId: string, interactionId: string): Promise<ContactForm | undefined> {
  return updateContact(contactId, (c) => ({
    interactions: (c.interactions ?? []).filter((i) => i.id !== interactionId),
  }));
}

export async function getContact(id: string): Promise<ContactForm | undefined> {
  return (await loadContacts()).find((c) => c.id === id);
}
