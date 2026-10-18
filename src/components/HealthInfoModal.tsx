import { Modal, Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { t } from "../i18n";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HealthInfoModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box}>
          <Text style={styles.title}>{t("Bağlantın nasıl hesaplanır?")}</Text>
          <Text style={styles.desc}>
            {t("Her kişi için seçtiğin görüşme sıklığına göre hesaplanır. Aralık içinde kaldıkça bağ güçlü kalır; süre aşıldıkça yavaşça zayıflar. Ertelediğin kişiler yolunda sayılır, tarihi olmayanlar hesaba katılmaz.")}
          </Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t("Anladım")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(10,8,30,0.4)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  box: {
    width: "100%", maxWidth: 360,
    backgroundColor: colors.bg, borderRadius: radius.modal, padding: 22,
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 8, textAlign: "center" },
  desc: { fontSize: 13, color: colors.textSub, lineHeight: 20, textAlign: "center", marginBottom: 18 },
  closeBtn: {
    height: 48, borderRadius: radius.button,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  closeBtnText: { fontSize: 14, fontWeight: "700", color: colors.white },
});
