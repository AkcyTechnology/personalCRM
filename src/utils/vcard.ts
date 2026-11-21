import { toSafeWebUrl } from "./links";

/** What the digital business card shows; name, e-mail and phone come from your profile. */
export type CardInfo = {
  fullName: string;
  title?: string;
  company?: string;
  about?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  address?: string;
  city?: string;
};

const MAX = 200;

/**
 * vCard 3.0 text value escaping (RFC 2426 §4): backslash, comma, semicolon
 * and line breaks. Other control characters are dropped, so a value can never
 * start a new property line (no field injection).
 */
export function vcardEscape(value: string): string {
  return value
    .slice(0, MAX)
    .replace(/\r\n|\r|\n/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

/** Only digits and one leading "+"; Turkish local numbers become +90. */
export function vcardPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "").slice(0, 20);
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  // Turkish local numbers (0532…, 532…) so other countries can dial them too.
  if (digits.length === 11 && digits.startsWith("0")) return `+90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  return digits;
}

/** A LinkedIn handle or URL as a safe https link, or "" when it isn't one. */
export function linkedinUrl(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^[a-z0-9-_%]{2,100}$/i.test(v)) return `https://www.linkedin.com/in/${v}`;
  const url = toSafeWebUrl(v);
  return url && /(^|\.)linkedin\.com$/i.test(url.replace(/^https?:\/\//i, "").split(/[/?#:]/)[0]) ? url : "";
}

/**
 * vCard 3.0 for the QR code, so scanning offers to save the contact. CRLF line
 * ends, escaped values, and links only when they are real http(s) URLs.
 */
export function buildVCard(card: CardInfo): string {
  const name = card.fullName.trim().replace(/\s+/g, " ");
  const parts = name.split(" ");
  const last = parts.length > 1 ? parts.pop()! : "";
  const first = parts.join(" ");
  const web = card.website ? toSafeWebUrl(card.website) : null;
  const li = card.linkedin ? linkedinUrl(card.linkedin) : "";
  const tel = card.phone ? vcardPhone(card.phone) : "";
  const email = card.email?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(card.email.trim()) ? card.email.trim() : "";
  const addressLine = [card.address?.trim(), card.city?.trim()].filter(Boolean).join(", ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vcardEscape(last)};${vcardEscape(first)};;;`,
    `FN:${vcardEscape(name)}`,
    card.company?.trim() ? `ORG:${vcardEscape(card.company.trim())}` : "",
    card.title?.trim() ? `TITLE:${vcardEscape(card.title.trim())}` : "",
    tel ? `TEL;TYPE=CELL:${tel}` : "",
    email ? `EMAIL;TYPE=INTERNET:${vcardEscape(email)}` : "",
    web ? `URL:${vcardEscape(web)}` : "",
    li ? `X-SOCIALPROFILE;TYPE=linkedin:${vcardEscape(li)}` : "",
    addressLine ? `ADR;TYPE=WORK:;;${vcardEscape(addressLine)};;;;` : "",
    card.about?.trim() ? `NOTE:${vcardEscape(card.about.trim())}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");
}
