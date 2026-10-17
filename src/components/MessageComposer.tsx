import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from "react-native";
import { copyWithAutoClear } from "../utils/clipboard";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import type { ContactForm } from "../screens/AddContactScreen";
import { generateMessage, TONE_LABELS, type MessageTone } from "../utils/messageSuggestion";
import { showToast } from "./Toast";
import { openWhatsApp as openWhatsAppLink } from "../utils/links";

type Props = {
  visible: boolean;
  contact: ContactForm | null;
  onClose: () => void;
  /** Called right before leaving the app to send the message. */
  onExternalSend?: () => void;
};

export default function MessageComposer({ visible, contact, onClose, onExternalSend }: Props) {
  const [tone, setTone] = useState<MessageTone>("samimi");
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState(0);

  useEffect(() => {
    if (visible && contact) {
      setTone("samimi");
      setVariant(0);
      setMessage(generateMessage(contact, "samimi"));
    }
  }, [visible, contact?.id, contact?.fullName]);

  const regenerate = (nextTone: MessageTone = tone) => {
    if (!contact) return;
    setTone(nextTone);
    setVariant((v) => v + 1);
    setMessage(generateMessage(contact, nextTone));
  };

  const copyMessage = async () => {
    await copyWithAutoClear(message);
    showToast("Mesaj kopyalandı · 90 sn sonra panodan silinir");
  };

  const openWhatsApp = () => {
    if (!contact?.phone) return;
    onExternalSend?.();
    onClose();
    openWhatsAppLink(contact.phone, message);
  };

  const canWhatsApp = !!contact?.phone;

  if (!contact) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box}>
          <Text style={styles.title}>Mesaj hazırla</Text>
          <Text style={styles.subtitle}>{contact.fullName} için · {TONE_LABELS[tone]}</Text>

          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={copyMessage} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Kopyala</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, !canWhatsApp && styles.btnDisabled]}
              onPress={canWhatsApp ? openWhatsApp : undefined}
              activeOpacity={0.85}
              disabled={!canWhatsApp}
            >
              <Text style={styles.primaryBtnText}>WhatsApp'ta Aç</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => regenerate()} activeOpacity={0.75}>
            <Text style={styles.secondaryBtnText}>Yeniden Oluştur</Text>
          </TouchableOpacity>

          <View style={styles.toneRow}>
            <TouchableOpacity style={styles.toneBtn} onPress={() => regenerate("daha-sicak")} activeOpacity={0.75}>
              <Text style={styles.toneBtnText}>Daha Samimi Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toneBtn} onPress={() => regenerate("profesyonel")} activeOpacity={0.75}>
              <Text style={styles.toneBtnText}>Daha Profesyonel Yap</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.closeBtnText}>Kapat</Text>
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
    width: "100%", maxWidth: 400,
    backgroundColor: colors.bg, borderRadius: radius.modal, padding: 22,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { marginTop: 4, fontSize: 12, color: colors.textSub, textAlign: "center" },

  messageBox: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    minHeight: 90,
  },
  messageText: { fontSize: 14, color: colors.text, lineHeight: 21 },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  primaryBtn: {
    flex: 1, height: 48, borderRadius: radius.button,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { backgroundColor: colors.primary + "45" },
  primaryBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  secondaryBtn: {
    marginTop: 10, height: 46, borderRadius: radius.button,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSub },

  toneRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
  toneBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
  },
  toneBtnText: { fontSize: 11.5, fontWeight: "700", color: colors.primary },

  closeBtn: { marginTop: 16, alignItems: "center", paddingVertical: 6 },
  closeBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
});
