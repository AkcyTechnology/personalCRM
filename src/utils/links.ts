import { Linking } from "react-native";
import { showToast } from "../components/Toast";

/**
 * Normalises a phone number to international digits for wa.me links.
 * Turkish local formats (0532…, 532…, 0090…) get the 90 country code.
 */
export function toWhatsAppNumber(phone: string, defaultCountryCode = "90"): string | null {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return digits.length >= 8 ? digits : null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = defaultCountryCode + digits.slice(1);
  else if (digits.length === 10 && digits.startsWith("5")) digits = defaultCountryCode + digits;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** Only http(s) web links are ever opened from user-entered data. */
export function toSafeWebUrl(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  if (!/^https?:\/\//i.test(withScheme)) return null;
  const host = withScheme.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  // Single character class + optional port: linear-time, not a ReDoS risk.
  // eslint-disable-next-line security/detect-unsafe-regex
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host) || !host.includes(".")) return null;
  return withScheme;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function open(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    showToast("Bağlantı açılamadı");
  }
}

export function openPhoneCall(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.replace(/\D/g, "").length < 3) return showToast("Geçersiz telefon numarası");
  return open(`tel:${cleaned}`);
}

export function openWhatsApp(phone: string, text?: string) {
  const number = toWhatsAppNumber(phone);
  if (!number) return showToast("WhatsApp için geçerli bir numara yok");
  return open(`https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`);
}

export function openEmail(email: string) {
  const value = email.trim();
  if (!EMAIL_RE.test(value)) return showToast("Geçersiz e-posta adresi");
  return open(`mailto:${encodeURIComponent(value).replace(/%40/g, "@")}`);
}

export function openWebUrl(input: string) {
  const url = toSafeWebUrl(input);
  if (!url) return showToast("Güvenli olmayan veya geçersiz bağlantı");
  return open(url);
}

const SOCIAL_BASE: Record<string, string> = {
  linkedin: "https://www.linkedin.com/in/",
  instagram: "https://www.instagram.com/",
  github: "https://github.com/",
  x: "https://x.com/",
  twitter: "https://x.com/",
  tiktok: "https://www.tiktok.com/@",
  facebook: "https://www.facebook.com/",
};

/** Builds a profile URL from a platform + handle, or validates a pasted URL. */
export function socialProfileUrl(platform: string, handle: string): string | null {
  const h = handle.trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h) || h.includes("/")) return toSafeWebUrl(h);
  const base = SOCIAL_BASE[platform.trim().toLowerCase()];
  const clean = h.replace(/^@/, "");
  if (!base || !/^[\w.-]+$/.test(clean)) return null;
  return base + clean;
}
