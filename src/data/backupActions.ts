import { showToast } from "../components/Toast";
import { exportBackupAsync, pickBackupAsync, restoreBackupAsync, wipeAllDataAsync } from "./backup";
import { confirmDialog, infoDialog } from "../utils/confirm";
import { t } from "../i18n";

/** UI flows around backup/restore/wipe, shared by Profile and Privacy screens. */

export async function runExportBackup() {
  try {
    const count = await exportBackupAsync();
    if (count === 0) showToast(t("Yedek oluşturuldu (henüz kişi yok)"));
  } catch (error) {
    console.warn("Yedek alınamadı:", error);
    infoDialog(t("Yedek alınamadı"), t("Dosya oluşturulurken bir sorun oluştu. Lütfen tekrar dene."));
  }
}

export async function runRestoreBackup(onDone?: () => void) {
  let backup;
  try {
    backup = await pickBackupAsync();
  } catch (error) {
    infoDialog(t("Yedek açılamadı"), error instanceof Error ? error.message : t("Dosya okunamadı."));
    return;
  }
  if (!backup) return;
  const count = backup.contacts.length;
  const restore = async (mode: "merge" | "replace") => {
    try {
      const added = await restoreBackupAsync(backup, mode);
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
