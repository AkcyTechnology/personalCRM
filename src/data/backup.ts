import { Platform, Share } from "react-native";
import type { ContactForm } from "../screens/AddContactScreen";
import { addContacts, loadContacts, saveContacts } from "./contacts";
import { loadSettings, saveSettings, updateSettings, type UserSettings } from "./userSettings";
import { addCustomRelationship, loadCustomRelationships } from "./relationshipTypes";
import { wipeSecureStorage } from "../storage/secureStorage";
import { cancelAllRemindersAsync } from "../utils/notifications";
import { isDuplicateContact } from "../utils/duplicateContact";
import { todayISO } from "../utils/dates";
import { resetAnalytics } from "../utils/analytics";
import { t } from "../i18n";
import { sanitizeContacts, sanitizePortableSettings } from "./sanitize";
import { decryptBackupText, encryptBackupText, isEncryptedBackup, WrongPasswordError } from "./backupCrypto";

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
  // Only known, well-typed fields; capped lists; unique ids (see sanitize.ts).
  const contacts = sanitizeContacts(obj.contacts);
  return {
    format: FORMAT,
    version: obj.version,
    exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt.slice(0, 40) : "",
    contacts,
    settings: sanitizePortableSettings(obj.settings),
    customRelationships: Array.isArray(obj.customRelationships)
      ? obj.customRelationships.filter((l): l is string => typeof l === "string" && !!l.trim()).map((l) => l.slice(0, 60)).slice(0, 100)
      : [],
  };
}

export type BackupText = { text: string; count: number; encrypted: boolean };

/** Serialises the backup; with a password it is sealed with scrypt + XChaCha20-Poly1305. */
export async function buildBackupText(password?: string, onProgress?: (p: number) => void): Promise<BackupText> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 2);
  if (!password) return { text: json, count: backup.contacts.length, encrypted: false };
  return { text: await encryptBackupText(json, password, { onProgress }), count: backup.contacts.length, encrypted: true };
}

/** Writes the backup to a temp file, opens the share sheet, then deletes the file. */
export async function shareBackupText({ text, encrypted }: BackupText): Promise<void> {
  const fileName = `connectly-yedek-${todayISO()}${encrypted ? "-sifreli" : ""}.json`;

  if (Platform.OS === "web") {
    await Share.share({ title: fileName, message: text });
    return;
  }

  const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
  const Sharing = require("expo-sharing") as typeof import("expo-sharing");
  const file = new File(Paths.cache, fileName);
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(text);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        UTI: "public.json",
        dialogTitle: t("Yedeği kaydet veya paylaş"),
      });
    } else {
      await Share.share({ title: fileName, message: text });
    }
  } finally {
    // Geçici kopya cihazda kalmasın
    try { if (file.exists) file.delete(); } catch {}
  }
}

/** Lets the user pick a backup file and returns its raw text. Returns null when cancelled. */
export async function pickBackupTextAsync(): Promise<string | null> {
  const DocumentPicker = require("expo-document-picker") as typeof import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 40 * 1024 * 1024) throw new Error(t("Dosya çok büyük."));

  if (Platform.OS === "web") return (await fetch(asset.uri)).text();
  const { File } = require("expo-file-system") as typeof import("expo-file-system");
  const file = new File(asset.uri);
  try {
    return await file.text();
  } finally {
    try { file.delete(); } catch {}
  }
}

export { isEncryptedBackup, WrongPasswordError };

/** Parses a picked backup; password-protected files need the password. */
export async function openBackupText(text: string, password?: string, onProgress?: (p: number) => void): Promise<BackupFile> {
  if (isEncryptedBackup(text)) {
    if (!password) throw new WrongPasswordError("password required");
    let plain: string;
    try {
      plain = await decryptBackupText(text, password, onProgress);
    } catch (e) {
      if (e instanceof WrongPasswordError) throw e;
      throw new Error(t("Bu dosya bozuk ya da bir Connectly yedeği değil."));
    }
    return parseBackup(plain);
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
      // Privacy and security choices always stay this phone's own.
      await saveSettings({ ...current, ...sanitizePortableSettings(backup.settings) });
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
  resetAnalytics();
  // Açık ekranlar ve uygulama kilidi sıfırlanan ayarları duysun
  await updateSettings({ appLockEnabled: false });
}
