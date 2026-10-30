import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { loadSettings, updateSettings } from "../data/userSettings";
import { analyticsAvailable } from "../utils/analytics";
import { colors } from "../theme/colors";
import { t } from "../i18n";

/**
 * Asks once — after the user has added someone — whether anonymous usage
 * statistics may be sent. Nothing is sent before a "yes".
 */
export default function AnalyticsConsent({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready || !analyticsAvailable()) return;
    loadSettings().then((s) => {
      if (!s.analyticsAsked) setVisible(true);
    });
  }, [ready]);

  const answer = async (yes: boolean) => {
    setVisible(false);
    await updateSettings({ analytics: yes, analyticsAsked: true });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => answer(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.icon}>
            <Ionicons name="heart-outline" size={26} color={colors.warmStrong} />
          </View>
          <Text style={styles.title} accessibilityRole="header">{t("Connectly'yi birlikte geliştirelim mi?")}</Text>
          <Text style={styles.body}>
            {t("Hangi özelliklerin işe yaradığını anlamak için anonim kullanım istatistikleri toplamak istiyoruz. Kişilerin, notların ve telefon numaraları asla gönderilmez. İstediğin zaman Gizlilik'ten kapatabilirsin.")}
          </Text>
          <TouchableOpacity style={styles.primary} onPress={() => answer(true)} accessibilityRole="button">
            <Text style={styles.primaryText}>{t("Evet, yardım edeyim")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => answer(false)} accessibilityRole="button">
            <Text style={styles.secondaryText}>{t("Hayır, teşekkürler")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  icon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.warmSoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 21, fontWeight: "900", color: colors.text, marginTop: 14 },
  body: { fontSize: 15, lineHeight: 22, color: colors.textSub, marginTop: 8 },
  primary: { marginTop: 20, minHeight: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.onFill, fontSize: 16, fontWeight: "800" },
  secondary: { marginTop: 8, minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.textSub, fontSize: 15, fontWeight: "700" },
});
