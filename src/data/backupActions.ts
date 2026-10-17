import { Alert } from "react-native";
import { showToast } from "../components/Toast";
import { exportBackupAsync, pickBackupAsync, restoreBackupAsync, wipeAllDataAsync } from "./backup";

/** UI flows around backup/restore/wipe, shared by Profile and Privacy screens. */

export async function runExportBackup() {
  try {
    const count = await exportBackupAsync();
    if (count === 0) showToast("Yedek oluşturuldu (henüz kişi yok)");
  } catch (error) {
    console.warn("Yedek alınamadı:", error);
    Alert.alert("Yedek alınamadı", "Dosya oluşturulurken bir sorun oluştu. Lütfen tekrar dene.");
  }
}

export async function runRestoreBackup(onDone?: () => void) {
  let backup;
  try {
    backup = await pickBackupAsync();
  } catch (error) {
    Alert.alert("Yedek açılamadı", error instanceof Error ? error.message : "Dosya okunamadı.");
    return;
  }
  if (!backup) return;
  const count = backup.contacts.length;
  const restore = async (mode: "merge" | "replace") => {
    try {
      const added = await restoreBackupAsync(backup, mode);
      showToast(mode === "replace" ? `${added} kişi geri yüklendi` : `${added} yeni kişi eklendi`);
      onDone?.();
    } catch {
      Alert.alert("Geri yükleme başarısız", "Veriler okunamadı veya kaydedilemedi.");
    }
  };
  Alert.alert(
    "Yedeği geri yükle",
    `Bu yedekte ${count} kişi var. Mevcut kişilerinle birleştirmek mi, yoksa tamamen değiştirmek mi istersin?`,
    [
      { text: "Vazgeç", style: "cancel" },
      { text: "Birleştir", onPress: () => restore("merge") },
      {
        text: "Değiştir",
        style: "destructive",
        onPress: () =>
          Alert.alert("Emin misin?", "Cihazdaki tüm kişiler silinip yedektekilerle değiştirilecek.", [
            { text: "Vazgeç", style: "cancel" },
            { text: "Değiştir", style: "destructive", onPress: () => restore("replace") },
          ]),
      },
    ]
  );
}

/** Two-step confirmation, then erases everything and calls onWiped. */
export function confirmWipeAllData(onWiped: () => void) {
  Alert.alert(
    "Tüm verileri sil",
    "Kişilerin, notların, görüşme geçmişin, kartvizitin ve ayarların bu cihazdan kalıcı olarak silinecek. Bu işlem geri alınamaz.",
    [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Önce yedek al",
        onPress: () => runExportBackup(),
      },
      {
        text: "Sil",
        style: "destructive",
        onPress: () =>
          Alert.alert("Son onay", "Tüm veriler silinsin mi?", [
            { text: "Vazgeç", style: "cancel" },
            {
              text: "Evet, hepsini sil",
              style: "destructive",
              onPress: async () => {
                try {
                  await wipeAllDataAsync();
                  onWiped();
                  showToast("Tüm veriler silindi");
                } catch {
                  Alert.alert("Silinemedi", "Veriler silinirken bir sorun oluştu. Lütfen tekrar dene.");
                }
              },
            },
          ]),
      },
    ]
  );
}
