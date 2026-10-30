import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from "@noble/ciphers/utils";
import { scryptAsync } from "@noble/hashes/scrypt";
import { randomBytes } from "../storage/secureStorage";

/**
 * Password-protected backups.
 *
 * Key: scrypt(password, 16-byte random salt, N=2^15, r=8, p=1) → 32 bytes.
 * Data: XChaCha20-Poly1305 with a 24-byte random nonce; the header (format,
 * version, KDF parameters, salt) is bound as associated data, so it cannot be
 * changed without the file failing to open.
 *
 * Without the password the file is unreadable — and there is no recovery.
 */
export const ENCRYPTED_FORMAT = "connectly-backup-encrypted" as const;
const VERSION = 1;
const KDF = { N: 2 ** 15, r: 8, p: 1 } as const;
export const MIN_PASSWORD_LENGTH = 8;

export type EncryptedBackup = {
  format: typeof ENCRYPTED_FORMAT;
  version: number;
  kdf: { name: "scrypt"; N: number; r: number; p: number; salt: string };
  cipher: "xchacha20poly1305";
  nonce: string;
  data: string;
};

export class WrongPasswordError extends Error {}

// The same characters typed on different keyboards must give the same key.
const normalize = (password: string) => utf8ToBytes(password.normalize("NFKC"));

function header(b: Pick<EncryptedBackup, "format" | "version" | "kdf" | "cipher">): Uint8Array {
  return utf8ToBytes(JSON.stringify([b.format, b.version, b.kdf.name, b.kdf.N, b.kdf.r, b.kdf.p, b.kdf.salt, b.cipher]));
}

export async function encryptBackupText(
  plain: string,
  password: string,
  opts: { kdf?: { N: number; r: number; p: number }; random?: (n: number) => Uint8Array; onProgress?: (p: number) => void } = {}
): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error("password too short");
  const random = opts.random ?? randomBytes;
  const params = opts.kdf ?? KDF;
  const salt = random(16);
  const nonce = random(24);
  const key = await scryptAsync(normalize(password), salt, { ...params, dkLen: 32, onProgress: opts.onProgress });
  const meta: Pick<EncryptedBackup, "format" | "version" | "kdf" | "cipher"> = {
    format: ENCRYPTED_FORMAT,
    version: VERSION,
    kdf: { name: "scrypt", N: params.N, r: params.r, p: params.p, salt: bytesToHex(salt) },
    cipher: "xchacha20poly1305",
  };
  const sealed = xchacha20poly1305(key, nonce, header(meta)).encrypt(utf8ToBytes(plain));
  key.fill(0);
  const file: EncryptedBackup = { ...meta, nonce: bytesToHex(nonce), data: bytesToHex(sealed) };
  return JSON.stringify(file);
}

/** Cheap check on the file's shape; does not need the password. */
export function isEncryptedBackup(text: string): boolean {
  try {
    const obj = JSON.parse(text) as Partial<EncryptedBackup>;
    return obj?.format === ENCRYPTED_FORMAT;
  } catch {
    return false;
  }
}

const HEX = /^[0-9a-f]*$/i;

/** Throws WrongPasswordError for a wrong password (or a tampered file), Error for a malformed one. */
export async function decryptBackupText(text: string, password: string, onProgress?: (p: number) => void): Promise<string> {
  let obj: EncryptedBackup;
  try {
    obj = JSON.parse(text) as EncryptedBackup;
  } catch {
    throw new Error("malformed");
  }
  const k = obj?.kdf;
  // Bounded parameters: a crafted file must not make the phone spend minutes or gigabytes.
  const valid =
    obj?.format === ENCRYPTED_FORMAT &&
    obj.version === VERSION &&
    obj.cipher === "xchacha20poly1305" &&
    k?.name === "scrypt" &&
    Number.isInteger(k.N) && k.N >= 2 ** 10 && k.N <= 2 ** 17 && (k.N & (k.N - 1)) === 0 &&
    Number.isInteger(k.r) && k.r >= 1 && k.r <= 16 &&
    Number.isInteger(k.p) && k.p >= 1 && k.p <= 4 &&
    typeof k.salt === "string" && k.salt.length === 32 && HEX.test(k.salt) &&
    typeof obj.nonce === "string" && obj.nonce.length === 48 && HEX.test(obj.nonce) &&
    typeof obj.data === "string" && obj.data.length % 2 === 0 && obj.data.length >= 32 && HEX.test(obj.data);
  if (!valid) throw new Error("malformed");

  const key = await scryptAsync(normalize(password), hexToBytes(k.salt), { N: k.N, r: k.r, p: k.p, dkLen: 32, onProgress });
  try {
    return bytesToUtf8(xchacha20poly1305(key, hexToBytes(obj.nonce), header(obj)).decrypt(hexToBytes(obj.data)));
  } catch {
    throw new WrongPasswordError("wrong password");
  } finally {
    key.fill(0);
  }
}
