import type { ContactForm } from "../screens/AddContactScreen";

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "").replace(/^90/, "").replace(/^0/, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A device contact is treated as a duplicate of an existing app contact if
 * the name matches, or if a non-empty phone/email matches — names alone are
 * unreliable (two different people can share a name; the same person can be
 * saved with slightly different name spelling), so phone/email are checked too.
 */
export function isDuplicateContact(
  candidate: { name: string; phone?: string; email?: string },
  existing: ContactForm[]
): boolean {
  const candidateName = normalizeName(candidate.name);
  const candidatePhone = candidate.phone ? normalizePhone(candidate.phone) : "";
  const candidateEmail = candidate.email ? normalizeEmail(candidate.email) : "";

  return existing.some((c) => {
    if (candidatePhone && c.phone && normalizePhone(c.phone) === candidatePhone) return true;
    if (candidateEmail && c.email && normalizeEmail(c.email) === candidateEmail) return true;
    return normalizeName(c.fullName) === candidateName;
  });
}
