import type { ContactForm } from "../screens/AddContactScreen";
import type { DeviceContact } from "./deviceContacts";
import { findSameName, findSameNumberOrEmail, phoneKey } from "./duplicateContact";

/**
 * Pure rules for bulk import from the address book, kept apart from the screen
 * so they can be tested:
 * - "added": the same address-book entry was imported before, or a saved
 *   contact has the same name AND shares a number/e-mail;
 * - "sharesNumber": another saved person uses this number (a family landline,
 *   a shared work phone) — still importable, nothing is merged;
 * - "sameName": only the name matches — importable, never merged by name.
 */
export type ImportStatus =
  | { kind: "new" }
  | { kind: "added" }
  | { kind: "sharesNumber"; with: string }
  | { kind: "sameName"; with: string };

const norm = (s: string) => s.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");

export function importStatus(dc: DeviceContact, existing: ContactForm[]): ImportStatus {
  if (existing.some((c) => c.deviceContactId && c.deviceContactId === dc.id)) return { kind: "added" };
  const same = findSameNumberOrEmail(dc, existing);
  if (same && norm(same.fullName) === norm(dc.name)) return { kind: "added" };
  if (same) return { kind: "sharesNumber", with: same.fullName };
  const named = findSameName(dc.name, existing);
  if (named) return { kind: "sameName", with: named.fullName };
  return { kind: "new" };
}

/** A new contact from an address-book entry. Every number is kept. */
export function toContact(dc: DeviceContact, today: string): ContactForm {
  const phones = dc.phones.length ? dc.phones : dc.phone ? [dc.phone] : [];
  const seen = new Set<string>();
  const unique = phones.filter((p) => {
    const k = phoneKey(p);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map((p) => p.replace(/\s+/g, " ").trim());
  return {
    fullName: dc.name,
    company: dc.company,
    jobTitle: dc.jobTitle,
    birthday: /^\d{2}\/\d{2}\/\d{4}$/.test(dc.birthday) ? dc.birthday : "",
    relationship: "",
    metWhere: "",
    phone: unique[0] ?? "",
    extraPhones: unique.length > 1 ? unique.slice(1) : undefined,
    email: dc.email.trim(),
    website: "",
    instagram: "",
    city: "",
    socials: [],
    tags: "",
    priority: "",
    notes: "",
    reminderFreq: "",
    // We don't know when they last talked: the reminder interval starts today
    // and no "last contact" is invented.
    lastContactDate: "",
    reminderIntervalStart: today,
    deviceContactId: dc.id,
  };
}

export type ImportResult = { added: number; skipped: number; failed: number };

/**
 * Saves the selected entries in small batches. Re-reads the saved contacts
 * first, so a double tap or a retry after a partial failure never adds the
 * same person twice; a failed batch doesn't undo the ones already saved.
 */
export async function importSelected(
  selected: DeviceContact[],
  today: string,
  deps: { load: () => Promise<ContactForm[]>; addMany: (list: ContactForm[]) => Promise<unknown> },
  batchSize = 50
): Promise<ImportResult> {
  const existing = await deps.load();
  const byId = new Map(selected.map((dc) => [dc.id, dc]));
  const fresh: ContactForm[] = [];
  let skipped = 0;
  for (const dc of byId.values()) {
    if (importStatus(dc, [...existing, ...fresh]).kind === "added") skipped += 1;
    else fresh.push(toContact(dc, today));
  }
  let added = 0;
  let failed = 0;
  for (let i = 0; i < fresh.length; i += batchSize) {
    const batch = fresh.slice(i, i + batchSize);
    try {
      await deps.addMany(batch);
      added += batch.length;
    } catch {
      failed += batch.length;
    }
  }
  return { added, skipped, failed };
}
