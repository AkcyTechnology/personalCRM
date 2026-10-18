import { useEffect, useState } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable, KeyboardAvoidingView, Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { InteractionType } from "../screens/AddContactScreen";
import { colors } from "../theme/colors";
import { todayISO } from "../utils/dates";
import DateField from "./DateField";
import { t } from "../i18n";

export const INTERACTION_TYPES: { type: InteractionType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "call",     label: "Arama",    icon: "call-outline" },
  { type: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" },
  { type: "message",  label: "Mesaj",    icon: "chatbubble-outline" },
  { type: "email",    label: "E-posta",  icon: "mail-outline" },
  { type: "meeting",  label: "Yüz yüze", icon: "people-outline" },
  { type: "other",    label: "Diğer",    icon: "ellipsis-horizontal" },
];

export function interactionMeta(type: InteractionType) {
  const meta = INTERACTION_TYPES.find((it) => it.type === type) ?? INTERACTION_TYPES[INTERACTION_TYPES.length - 1];
  return { ...meta, label: t(meta.label) };
}

type Props = {
  visible: boolean;
  contactName: string;
  initialType?: InteractionType;
  onClose: () => void;
  onSave: (type: InteractionType, note: string, date: string) => void;
};

/** "Görüştüm" sheet: pick how you got in touch, optionally add a note. */
export default function LogInteractionModal({ visible, contactName, initialType = "other", onClose, onSave }: Props) {
  const [type, setType] = useState<InteractionType>(initialType);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setNote("");
      setDate(todayISO());
    }
  }, [visible, initialType]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>{t("{name} ile görüştün 🎉", { name: contactName })}</Text>
            <Text style={styles.sub}>{t("Nasıl iletişime geçtin?")}</Text>

            <View style={styles.types}>
              {INTERACTION_TYPES.map((it) => {
                const active = it.type === type;
                return (
                  <TouchableOpacity
                    key={it.type}
                    style={[styles.type, active && styles.typeActive]}
                    onPress={() => setType(it.type)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(it.label)}
                  >
                    <Ionicons name={it.icon} size={18} color={active ? colors.primary : colors.textSub} />
                    <Text style={[styles.typeText, active && styles.typeTextActive]}>{t(it.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <DateField label={t("Tarih")} format="iso" value={date} onChange={(v) => setDate(v || todayISO())} maximumDate={new Date()} clearable={false} />

            <Text style={styles.label}>{t("Not (isteğe bağlı)")}</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder={t("Ne konuştunuz? Bir dahaki sefere hatırlamak istediğin bir şey var mı?")}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              accessibilityLabel={t("Görüşme notu")}
            />

            <TouchableOpacity
              style={styles.save}
              onPress={() => onSave(type, note, date)}
              accessibilityRole="button"
              accessibilityLabel={t("Görüşmeyi kaydet")}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.saveText}>{t("Kaydet")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  title: { fontSize: 19, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textSub, marginTop: 4, marginBottom: 14 },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  type: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  typeActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  typeText: { fontSize: 14, color: colors.textSub, fontWeight: "600" },
  typeTextActive: { color: colors.primary },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSub, marginBottom: 6 },
  input: {
    minHeight: 84, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12,
    fontSize: 15, color: colors.text, textAlignVertical: "top",
  },
  save: {
    marginTop: 16, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 14,
  },
  saveText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
