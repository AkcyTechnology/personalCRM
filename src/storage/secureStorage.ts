import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from "@noble/ciphers/utils";

/**
 * Encrypted key/value storage on top of AsyncStorage.
 *
 * Every value is sealed with XChaCha20-Poly1305 (authenticated encryption).
 * The 256-bit data key is generated on first use and kept in the OS keychain
 * (iOS Keychain / Android Keystore via expo-secure-store) with
 * WHEN_UNLOCKED_THIS_DEVICE_ONLY, so it never leaves the device and is not
 * part of cloud/device backups — an AsyncStorage dump or backup alone is
 * unreadable.
 *
 * Values written by older app versions in plain text are still readable and
 * are re-encrypted transparently on first read.
 *
 * Web has no keychain, so values stay in plain localStorage there.
 */

const PREFIX = "enc1:";
const KEY_NAME = "crm_data_key_v1";
const NONCE_BYTES = 24;

const encryptionAvailable = Platform.OS === "ios" || Platform.OS === "android";

let keyPromise: Promise<Uint8Array> | null = null;

function randomBytes(n: number): Uint8Array {
  const Crypto = require("expo-crypto") as typeof import("expo-crypto");
  return Crypto.getRandomBytes(n);
}

async function getKey(): Promise<Uint8Array> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
      const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
      const existing = await SecureStore.getItemAsync(KEY_NAME, options);
      if (existing) return hexToBytes(existing);
      const key = randomBytes(32);
      await SecureStore.setItemAsync(KEY_NAME, bytesToHex(key), options);
      return key;
    })().catch((error) => {
      keyPromise = null;
      throw error;
    });
  }
  return keyPromise;
}

export function encryptWithKey(key: Uint8Array, plaintext: string, nonce: Uint8Array): string {
  const sealed = xchacha20poly1305(key, nonce).encrypt(utf8ToBytes(plaintext));
  return PREFIX + bytesToHex(nonce) + bytesToHex(sealed);
}

export function decryptWithKey(key: Uint8Array, stored: string): string {
  const hex = stored.slice(PREFIX.length);
  const nonce = hexToBytes(hex.slice(0, NONCE_BYTES * 2));
  const sealed = hexToBytes(hex.slice(NONCE_BYTES * 2));
  return bytesToUtf8(xchacha20poly1305(key, nonce).decrypt(sealed));
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

export async function secureGetItem(name: string): Promise<string | null> {
  const stored = await AsyncStorage.getItem(name);
  if (stored === null || !encryptionAvailable) return stored;
  if (isEncrypted(stored)) return decryptWithKey(await getKey(), stored);
  // Legacy plain-text value: migrate it in place.
  await secureSetItem(name, stored);
  return stored;
}

export async function secureSetItem(name: string, value: string): Promise<void> {
  if (!encryptionAvailable) {
    await AsyncStorage.setItem(name, value);
    return;
  }
  const key = await getKey();
  await AsyncStorage.setItem(name, encryptWithKey(key, value, randomBytes(NONCE_BYTES)));
}

export async function secureRemoveItem(name: string): Promise<void> {
  await AsyncStorage.removeItem(name);
}

/** Erases every value this app stored, plus the data key itself. */
export async function wipeSecureStorage(): Promise<void> {
  await AsyncStorage.clear();
  keyPromise = null;
  if (encryptionAvailable) {
    try {
      const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
      await SecureStore.deleteItemAsync(KEY_NAME);
    } catch {}
  }
}
