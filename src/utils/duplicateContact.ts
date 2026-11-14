import type { ContactForm } from "../screens/AddContactScreen";

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

/**
 * A comparable key for a phone number, independent of spaces, dashes and the
 * international prefix: "+90 532 111 22 33", "0532 111 2233" and
 * "00905321112233" all give "5321112233". Numbers with at least 10 digits are
 * compared by their last 10 digits (the national number in TR and most of
 * Europe/US); shorter ones (short codes, extensions) must match exactly.
 */
export function phoneKey(phone?: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(email?: string): string {
  return (email ?? "").trim().toLowerCase();
}

function phonesOf(c: { phone?: string; extraPhones?: string[] }): string[] {
  return [c.phone, ...(c.extraPhones ?? [])].map(phoneKey).filter(Boolean);
}

/** The saved contact that shares a phone number or e-mail with the candidate, if any. */
export function findSameNumberOrEmail(
  candidate: { phone?: string; phones?: string[]; email?: string },
  existing: ContactForm[]
): ContactForm | undefined {
  const keys = new Set([candidate.phone, ...(candidate.phones ?? [])].map(phoneKey).filter(Boolean));
  const email = normalizeEmail(candidate.email);
  return existing.find((c) => {
    if (email && normalizeEmail(c.email) === email) return true;
    return phonesOf(c).some((k) => keys.has(k));
  });
}

/**
 * True when the candidate is very likely the same person as a saved contact:
 * same phone number or same e-mail. Names alone never count — two people can
 * share a name, and merging them would lose data.
 */
export function isDuplicateContact(
  candidate: { name: string; phone?: string; phones?: string[]; email?: string },
  existing: ContactForm[]
): boolean {
  return !!findSameNumberOrEmail(candidate, existing);
}

/** A saved contact with exactly the same name — only for a "did you mean…?" warning. */
export function findSameName(name: string, existing: ContactForm[]): ContactForm | undefined {
  const n = normalizeName(name);
  return n ? existing.find((c) => normalizeName(c.fullName) === n) : undefined;
}
