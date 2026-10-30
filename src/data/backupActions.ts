import { showToast } from "../components/Toast";
import { passwordPrompt } from "../components/PasswordPrompt";
import {
  buildBackupText,
  isEncryptedBackup,
  openBackupText,
  pickBackupTextAsync,
  restoreBackupAsync,
  shareBackupText,
  wipeAllDataAsync,
  WrongPasswordError,
  type BackupFile,
  type BackupText,
} from "./backup";
import { confirmDialog, infoDialog } from "../utils/confirm";
import { t } from "../i18n";

/** UI flows around backup/restore/wipe, shared by Profile and Privacy screens. */

async function share(backup: BackupText) {
  try {
    await shareBackupText(backup);
    if (backup.count === 0) showToast(t("Yedek oluşturuldu (henüz kişi yok)"));
  } catch (error) {
    console.warn("Yedek alınamadı:", error);
    infoDialog(t("Yedek alınamadı"), t("Dosya oluşturulurken bir sorun oluştu. Lütfen tekrar dene."));
  }
}

async function exportWithPassword() {
  let built: BackupText | null = null;
  const ok = await passwordPrompt({
    title: t("Yedek için parola belirle"),
    message: t("Bu parolayı bir yere not et. Parolayı unutursan yedek açılamaz; kimse kurtaramaz."),
    submitLabel: t("Şifrele ve paylaş"),
    confirm: true,
    onSubmit: async (password, progress) => {
      built = await buildBackupText(password, progress);
      return null;
    },
  });
  if (ok && built) await share(built);
}

export function runExportBackup() {
  confirmDialog(
    t("Yedeği parolayla korumak ister misin?"),
    t("Parolalı yedek, dosyayı ele geçiren birinin kişilerini ve notlarını okumasını engeller."),
    [
      { text: t("Vazgeç"), style: "cancel" },
      { text: t("Parola belirle (önerilen)"), onPress: () => void exportWithPassword() },
      {
        text: t("Parolasız devam et"),
        onPress: async () => {
          try {
            await share(await buildBackupText());
          } catch {
            infoDialog(t("Yedek alınamadı"), t("Dosya oluşturulurken bir sorun oluştu. Lütfen tekrar dene."));
          }
        },
      },
    ]
  );
}

async function unlock(text: string): Promise<BackupFile | null> {
  let opened: BackupFile | null = null;
  const ok = await passwordPrompt({
    title: t("Bu yedek parolalı"),
    message: t("Yedeği alırken belirlediğin parolayı yaz."),
    submitLabel: t("Aç"),
    onSubmit: async (password, progress) => {
      try {
        opened = await openBackupText(text, password, progress);
        return null;
      } catch (e) {
        if (e instanceof WrongPasswordError) return t("Parola yanlış. Tekrar dene.");
        return e instanceof Error ? e.message : t("Dosya okunamadı.");
      }
    },
  });
  return ok ? opened : null;
}

export async function runRestoreBackup(onDone?: () => void) {
  let backup: BackupFile | null;
  try {
    const text = await pickBackupTextAsync();
    if (text === null) return;
    backup = isEncryptedBackup(text) ? await unlock(text) : await openBackupText(text);
  } catch (error) {
    infoDialog(t("Yedek açılamadı"), error instanceof Error ? error.message : t("Dosya okunamadı."));
    return;
  }
  if (!backup) return;
  const picked = backup;
  const count = picked.contacts.length;
  const restore = async (mode: "merge" | "replace") => {
    try {
      const added = await restoreBackupAsync(picked, mode);
      showToast(mode === "replace" ? t("{count} kişi geri yüklendi", { count: added }) : t("{count} yeni kişi eklendi", { count: added }));
      onDone?.();
    } catch {
      infoDialog(t("Geri yükleme başarısız"), t("Veriler okunamadı veya kaydedilemedi."));
    }
  };
  confirmDialog(t("Yedeği geri yükle"),
    t("Bu yedekte {count} kişi var. Mevcut kişilerinle birleştirmek mi, yoksa tamamen değiştirmek mi istersin?", { count }),
    [
      { text: t("Vazgeç"), style: "cancel" },
      { text: t("Birleştir"), onPress: () => restore("merge") },
      {
        text: t("Değiştir"),
        style: "destructive",
        onPress: () =>
          confirmDialog(t("Emin misin?"), t("Cihazdaki tüm kişiler silinip yedektekilerle değiştirilecek."), [
            { text: t("Vazgeç"), style: "cancel" },
            { text: t("Değiştir"), style: "destructive", onPress: () => restore("replace") },
          ]),
      },
    ]
  );
}

/** Two-step confirmation, then erases everything and calls onWiped. */
export function confirmWipeAllData(onWiped: () => void) {
  confirmDialog(t("Tüm verileri sil"), t("Kişilerin, notların, görüşme geçmişin, kartvizitin ve ayarların bu cihazdan kalıcı olarak silinecek. Bu işlem geri alınamaz."),
    [
      { text: t("Vazgeç"), style: "cancel" },
      {
        text: t("Önce yedek al"),
        onPress: () => runExportBackup(),
      },
      {
        text: t("Sil"),
        style: "destructive",
        onPress: () =>
          confirmDialog(t("Son onay"), t("Tüm veriler silinsin mi?"), [
            { text: t("Vazgeç"), style: "cancel" },
            {
              text: t("Evet, hepsini sil"),
              style: "destructive",
              onPress: async () => {
                try {
                  await wipeAllDataAsync();
                  onWiped();
                  showToast(t("Tüm veriler silindi"));
                } catch {
                  infoDialog(t("Silinemedi"), t("Veriler silinirken bir sorun oluştu. Lütfen tekrar dene."));
                }
              },
            },
          ]),
      },
    ]
  );
}
