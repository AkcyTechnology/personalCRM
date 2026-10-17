import { Modal, Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HealthInfoModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box}>
          <Text style={styles.title}>İlişki Sağlığı nedir?</Text>
          <Text style={styles.desc}>
            İlişki sağlığı; son iletişim tarihi, kişi bazlı iletişim aralığı, ertelenen hatırlatıcılar ve yaklaşan özel günlere göre hesaplanır.
          </Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Anladım</Text>
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
  closeBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
