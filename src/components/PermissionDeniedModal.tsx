import { Modal, Pressable, Text, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { t } from "../i18n";

type Props = {
  visible: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

export default function PermissionDeniedModal({ visible, title, description, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { onClose(); Linking.openSettings(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t("Ayarları aç")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.secondaryBtnText}>{t("Vazgeç")}</Text>
          </TouchableOpacity>
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
    backgroundColor: colors.bg, borderRadius: radius.modal, padding: 24,
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8, textAlign: "center" },
  desc: { fontSize: 14, color: colors.textSub, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  primaryBtn: {
    width: "100%", height: 50, borderRadius: radius.button,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  primaryBtnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  secondaryBtn: {
    width: "100%", height: 50, borderRadius: radius.button,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  secondaryBtnText: { color: colors.textSub, fontWeight: "700", fontSize: 15 },
});
