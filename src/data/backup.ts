import { Platform, Share } from "react-native";
import type { ContactForm } from "../screens/AddContactScreen";
import { addContacts, loadContacts, saveContacts } from "./contacts";
import { loadSettings, saveSettings, updateSettings, type UserSettings } from "./userSettings";
import { addCustomRelationship, loadCustomRelationships } from "./relationshipTypes";
import { wipeSecureStorage } from "../storage/secureStorage";
import { cancelAllRemindersAsync } from "../utils/notifications";
import { isDuplicateContact } from "../utils/duplicateContact";
import { todayISO } from "../utils/dates";
import { t } from "../i18n";

const FORMAT = "connectly-backup";
const VERSION = 1;

export type BackupFile = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  contacts: ContactForm[];
  settings?: Partial<UserSettings>;
  customRelationships?: string[];
};

export async function buildBackup(): Promise<BackupFile> {
  const [contacts, settings, customRelationships] = await Promise.all([
    loadContacts(),
    loadSettings(),
    loadCustomRelationships(),
  ]);
  // Güvenlik tercihleri yedekle başka cihaza taşınmaz.
  const { appLockEnabled: _lock, ...portableSettings } = settings;
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    contacts,
    settings: portableSettings,
    customRelationships,
  };
}

/** Validates an untrusted backup file; returns only well-formed contacts. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(t("Dosya okunamadı. Geçerli bir Connectly yedeği seç."));
  }
  const obj = data as Partial<BackupFile>;
  if (!obj || obj.format !== FORMAT || !Array.isArray(obj.contacts)) {
    throw new Error(t("Bu dosya bir Connectly yedeği değil."));
  }
  if (typeof obj.version !== "number" || obj.version > VERSION) {
    throw new Error(t("Bu yedek daha yeni bir uygulama sürümüyle oluşturulmuş."));
  }
  const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
  const contacts: ContactForm[] = obj.contacts
    .filter((c): c is ContactForm => !!c && typeof c === "object" && typeof (c as ContactForm).fullName === "string" && !!(c as ContactForm).fullName.trim())
    .slice(0, 10_000)
    .map((c) => ({
      ...c,
      id: typeof c.id === "string" ? c.id : undefined,
      fullName: str(c.fullName, 200),
      company: str(c.company, 200),
      jobTitle: str(c.jobTitle, 200),
      birthday: str(c.birthday, 20),
      relationship: str(c.relationship, 100),
      metWhere: str(c.metWhere, 200),
      phone: str(c.phone, 40),
      email: str(c.email, 200),
      website: str(c.website, 500),
      instagram: str(c.instagram, 200),
      city: str(c.city, 200),
      socials: Array.isArray(c.socials)
        ? c.socials.filter((s) => s && typeof s.platform === "string" && typeof s.handle === "string").slice(0, 20)
        : [],
      tags: str(c.tags, 500),
      priority: str(c.priority, 50),
      lastContactDate: str(c.lastContactDate, 30),
      reminderFreq: str(c.reminderFreq, 50),
      notes: str(c.notes, 20_000),
      reminderIntervalDays: typeof c.reminderIntervalDays === "number" && c.reminderIntervalDays > 0 ? Math.round(c.reminderIntervalDays) : undefined,
      interactions: Array.isArray(c.interactions)
        ? c.interactions
            .filter((i) => i && typeof i.id === "string" && typeof i.date === "string" && typeof i.type === "string")
            .map((i) => ({ ...i, note: typeof i.note === "string" ? i.note.slice(0, 5000) : undefined }))
        : [],
    }));
  return { ...(obj as BackupFile), contacts };
}

/** Writes a JSON backup to a temp file, opens the share sheet, then deletes the file. */
export async function exportBackupAsync(): Promise<number> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const fileName = `connectly-yedek-${todayISO()}.json`;

  if (Platform.OS === "web") {
    await Share.share({ title: fileName, message: json });
    return backup.contacts.length;
  }

  const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
  const Sharing = require("expo-sharing") as typeof import("expo-sharing");
  const file = new File(Paths.cache, fileName);
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        UTI: "public.json",
        dialogTitle: t("Yedeği kaydet veya paylaş"),
      });
    } else {
      await Share.share({ title: fileName, message: json });
    }
  } finally {
    // Şifresiz kopya cihazda kalmasın
    try { if (file.exists) file.delete(); } catch {}
  }
  return backup.contacts.length;
}

/** Lets the user pick a backup file. Returns null when cancelled. */
export async function pickBackupAsync(): Promise<BackupFile | null> {
  const DocumentPicker = require("expo-document-picker") as typeof import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 20 * 1024 * 1024) throw new Error(t("Dosya çok büyük."));

  let text: string;
  if (Platform.OS === "web") {
    text = await (await fetch(asset.uri)).text();
  } else {
    const { File } = require("expo-file-system") as typeof import("expo-file-system");
    const file = new File(asset.uri);
    try {
      text = await file.text();
    } finally {
      try { file.delete(); } catch {}
    }
  }
  return parseBackup(text);
}

/** merge: skips contacts that already exist; replace: overwrites all contacts. */
export async function restoreBackupAsync(backup: BackupFile, mode: "merge" | "replace"): Promise<number> {
  for (const label of (backup.customRelationships ?? []).filter((l) => typeof l === "string").slice(0, 100)) {
    await addCustomRelationship(label.slice(0, 60));
  }
  if (mode === "replace") {
    await saveContacts(backup.contacts.map((c) => ({ ...c, id: c.id ?? undefined })));
    // id'si olmayanlar bir sonraki okumada tamamlanır
    await loadContacts();
    if (backup.settings) {
      const current = await loadSettings();
      await saveSettings({ ...current, ...backup.settings, appLockEnabled: current.appLockEnabled });
    }
    return backup.contacts.length;
  }
  const existing = await loadContacts();
  const existingIds = new Set(existing.map((c) => c.id));
  const fresh = backup.contacts.filter(
    (c) => !(c.id && existingIds.has(c.id)) && !isDuplicateContact({ name: c.fullName, phone: c.phone, email: c.email }, existing)
  );
  if (fresh.length) await addContacts(fresh);
  return fresh.length;
}

/** Deletes every piece of data the app stored on this device. */
export async function wipeAllDataAsync(): Promise<void> {
  await cancelAllRemindersAsync();
  await wipeSecureStorage();
  // Açık ekranlar ve uygulama kilidi sıfırlanan ayarları duysun
  await updateSettings({ appLockEnabled: false });
}
