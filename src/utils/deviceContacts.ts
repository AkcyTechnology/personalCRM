import { Platform } from "react-native";
import type * as LegacyContacts from "expo-contacts/legacy";
import { t } from "../i18n";

/**
 * Single entry point to the device address book. The native module is loaded
 * lazily so a missing/unlinked expo-contacts shows a clear message instead of
 * crashing the whole app at import time.
 */

export type DeviceContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  jobTitle: string;
  birthday: string;
};

export class ContactsUnavailableError extends Error {
  constructor() {
    super(
      t("Rehber modülü bu derlemede bulunamadı. Terminalde `npx expo install expo-contacts` çalıştırıp uygulamayı yeniden başlat; development build kullanıyorsan uygulamayı yeniden derle.")
    );
  }
}

export class ContactsPermissionError extends Error {
  constructor() {
    super(t("Rehber izni verilmedi."));
  }
}

function load(): typeof LegacyContacts {
  if (Platform.OS === "web") throw new ContactsUnavailableError();
  try {
    const mod = require("expo-contacts/legacy") as typeof LegacyContacts;
    if (!mod?.requestPermissionsAsync) throw new Error("missing");
    return mod;
  } catch {
    throw new ContactsUnavailableError();
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function map(c: LegacyContacts.ExistingContact, i = 0): DeviceContact {
  const b = c.birthday;
  return {
    id: c.id ?? String(i),
    name: (c.name ?? [c.firstName, c.lastName].filter(Boolean).join(" ")).trim(),
    phone: c.phoneNumbers?.[0]?.number?.trim() ?? "",
    email: c.emails?.[0]?.email?.trim() ?? "",
    company: c.company?.trim() ?? "",
    jobTitle: c.jobTitle?.trim() ?? "",
    birthday:
      b && b.day && b.month !== undefined
        ? `${pad(b.day)}/${pad(b.month + 1)}${b.year ? `/${b.year}` : ""}`
        : "",
  };
}

async function ensurePermission(Contacts: typeof LegacyContacts) {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") throw new ContactsPermissionError();
}

/**
 * Opens the system contact picker for one contact. On iOS this needs no
 * address-book permission at all — the app only receives the chosen person.
 */
export async function pickDeviceContactAsync(): Promise<DeviceContact | null> {
  const Contacts = load();
  if (Platform.OS === "android") await ensurePermission(Contacts);
  const picked = await Contacts.presentContactPickerAsync();
  return picked ? map(picked) : null;
}

/** Reads only the fields needed for bulk import (no notes, addresses, images…). */
export async function listDeviceContactsAsync(): Promise<DeviceContact[]> {
  const Contacts = load();
  await ensurePermission(Contacts);
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.FirstName,
      Contacts.Fields.LastName,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
      Contacts.Fields.Birthday,
    ],
    sort: Contacts.SortTypes.FirstName,
  });
  return (data ?? []).map(map).filter((c) => !!c.name);
}
