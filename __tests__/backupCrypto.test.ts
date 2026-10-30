import { decryptBackupText, encryptBackupText, isEncryptedBackup, WrongPasswordError } from "../src/data/backupCrypto";
import { openBackupText } from "../src/data/backup";

jest.mock("../src/components/Toast", () => ({ showToast: jest.fn() }));

// Fast parameters for most tests; the default (N = 2^15) is checked once below.
const FAST = { N: 2 ** 10, r: 8, p: 1 };
const backupJson = JSON.stringify({
  format: "connectly-backup",
  version: 1,
  exportedAt: "2026-10-31T10:00:00Z",
  contacts: [{ id: "a", fullName: "Ayşe Demir", phone: "+90 555 000 00 00", notes: "gizli not", interactions: [] }],
});

describe("password-protected backups", () => {
  it("round-trips and hides the content", async () => {
    const sealed = await encryptBackupText(backupJson, "doğru-parola-123", { kdf: FAST });
    expect(isEncryptedBackup(sealed)).toBe(true);
    expect(isEncryptedBackup(backupJson)).toBe(false);
    expect(sealed).not.toContain("Ayşe");
    expect(sealed).not.toContain("gizli");
    expect(await decryptBackupText(sealed, "doğru-parola-123")).toBe(backupJson);
  });

  it("uses a fresh salt and nonce every time", async () => {
    const a = JSON.parse(await encryptBackupText(backupJson, "parola-1234", { kdf: FAST }));
    const b = JSON.parse(await encryptBackupText(backupJson, "parola-1234", { kdf: FAST }));
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.data).not.toBe(b.data);
  });

  it("rejects a wrong password", async () => {
    const sealed = await encryptBackupText(backupJson, "doğru-parola-123", { kdf: FAST });
    await expect(decryptBackupText(sealed, "yanlis-parola-123")).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("treats the same password typed in another Unicode form as equal", async () => {
    const composed = "şifre-ğüç-12"; // NFC
    const decomposed = composed.normalize("NFD");
    const sealed = await encryptBackupText(backupJson, composed, { kdf: FAST });
    expect(await decryptBackupText(sealed, decomposed)).toBe(backupJson);
  });

  it("detects tampering with the data or the header", async () => {
    const sealed = JSON.parse(await encryptBackupText(backupJson, "parola-1234", { kdf: FAST }));
    const flipped = { ...sealed, data: (sealed.data[0] === "0" ? "1" : "0") + sealed.data.slice(1) };
    await expect(decryptBackupText(JSON.stringify(flipped), "parola-1234")).rejects.toBeInstanceOf(WrongPasswordError);
    const otherSalt = { ...sealed, kdf: { ...sealed.kdf, salt: "00".repeat(16) } };
    await expect(decryptBackupText(JSON.stringify(otherSalt), "parola-1234")).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it("refuses crafted KDF parameters before doing any work", async () => {
    const sealed = JSON.parse(await encryptBackupText(backupJson, "parola-1234", { kdf: FAST }));
    for (const kdf of [{ N: 2 ** 24 }, { N: 1000 }, { r: 64 }, { p: 16 }, { salt: "zz" }]) {
      const bad = JSON.stringify({ ...sealed, kdf: { ...sealed.kdf, ...kdf } });
      await expect(decryptBackupText(bad, "parola-1234")).rejects.toThrow("malformed");
    }
    await expect(decryptBackupText("not json", "x")).rejects.toThrow("malformed");
  });

  it("requires at least 8 characters", async () => {
    await expect(encryptBackupText(backupJson, "kisa", { kdf: FAST })).rejects.toThrow();
  });

  it("opens through the normal restore path and validates the contacts", async () => {
    const sealed = await encryptBackupText(backupJson, "parola-1234", { kdf: FAST });
    await expect(openBackupText(sealed)).rejects.toBeInstanceOf(WrongPasswordError);
    const backup = await openBackupText(sealed, "parola-1234");
    expect(backup.contacts.map((c) => c.fullName)).toEqual(["Ayşe Demir"]);
    // Plain backups still open without a password.
    expect((await openBackupText(backupJson)).contacts).toHaveLength(1);
  });

  it("uses scrypt N = 2^15 by default", async () => {
    const sealed = JSON.parse(await encryptBackupText(backupJson, "parola-1234"));
    expect(sealed.kdf).toMatchObject({ name: "scrypt", N: 32768, r: 8, p: 1 });
    expect(sealed.cipher).toBe("xchacha20poly1305");
  });
});
