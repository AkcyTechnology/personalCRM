import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ContactForm } from "../screens/AddContactScreen";
import Avatar from "./Avatar";
import { showToast } from "./Toast";
import { colors } from "../theme/colors";
import { copyWithAutoClear } from "../utils/clipboard";
import { openWhatsApp, toWhatsAppNumber } from "../utils/links";
import { confirmDialog } from "../utils/confirm";
import { getHelloDraft, helloSuggestions, setHelloDraft, type HelloDraft } from "../utils/helloSuggestions";
import { t, tv } from "../i18n";

type Props = {
  visible: boolean;
  contact: ContactForm | null;
  onClose: () => void;
};

/**
 * "Merhaba de" from the person-of-the-day card: two short openers chosen from
 * what the app knows, an editable message, then WhatsApp or Copy. Neither
 * action logs a catch-up; sending stays with the user. The draft is kept per
 * person for this session.
 */
export default function HelloSheet({ visible, contact, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const input = useRef<TextInput>(null);
  const [draft, setDraft] = useState<HelloDraft>({ text: "", fromSuggestion: null });
  // Shown on the button itself: a toast would sit behind this modal on phones.
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  const id = contact?.id ?? contact?.fullName ?? "";
  const suggestions = useMemo(() => (contact ? helloSuggestions(contact) : null), [contact]);

  // Each person has their own draft: restore it on open, never carry it over.
  useEffect(() => {
    if (visible && id) {
      setDraft(getHelloDraft(id) ?? { text: "", fromSuggestion: null });
      setCopied(false);
    }
  }, [visible, id]);

  if (!contact || !suggestions) return null;

  const update = (next: HelloDraft) => {
    setDraft(next);
    setCopied(false);
    setHelloDraft(id, next);
  };

  // Hand-edited text is never replaced without asking.
  const edited = draft.text.trim() !== "" && draft.text !== draft.fromSuggestion;
  const replace = (next: HelloDraft, after?: () => void) => {
    if (!edited || next.text === draft.text) {
      update(next);
      after?.();
      return;
    }
    confirmDialog(t("Taslağın değişsin mi?"), t("Yazdığın mesajın yerine bu metin gelecek."), [
      { text: t("Vazgeç"), style: "cancel" },
      { text: t("Değiştir"), onPress: () => { update(next); after?.(); } },
    ]);
  };

  const hasPhone = !!(contact.phone && toWhatsAppNumber(contact.phone));
  const empty = draft.text.trim() === "";

  const copy = async () => {
    if (empty) return;
    try {
      await copyWithAutoClear(draft.text.trim());
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2500);
      showToast(t("Mesaj kopyalandı"));
      AccessibilityInfo.announceForAccessibility?.(t("Mesaj kopyalandı"));
    } catch {
      showToast(t("Mesaj kopyalanamadı. Lütfen tekrar dene."));
    }
  };

  const whatsapp = () => {
    if (empty || !contact.phone) return;
    onClose();
    openWhatsApp(contact.phone, draft.text.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">{t("Mesajını hazırla")}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
                <Ionicons name="close" size={22} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={{ gap: 10, paddingBottom: 4 }} keyboardShouldPersistTaps="handled">
              <View style={styles.person}>
                <Avatar name={contact.fullName} avatarId={contact.avatarId} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.personName} numberOfLines={1}>{contact.fullName}</Text>
                  {contact.relationship ? <Text style={styles.personSub}>{tv(contact.relationship)}</Text> : null}
                </View>
              </View>

              <Text style={styles.label}>{t("Öneriler")}</Text>
              {suggestions.map((s) => {
                const on = draft.text === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.suggestion, on && styles.suggestionOn]}
                    onPress={() => replace({ text: s, fromSuggestion: s })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityHint={t("Metni mesaj alanına yerleştirir")}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                    {on ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.ownRow}
                onPress={() => replace({ text: "", fromSuggestion: null }, () => setTimeout(() => input.current?.focus(), 50))}
                accessibilityRole="button"
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.ownText}>{t("Kendi mesajımı yaz")}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>{t("Mesajın")}</Text>
              <TextInput
                ref={input}
                style={styles.input}
                value={draft.text}
                onChangeText={(text) => update({ text, fromSuggestion: draft.fromSuggestion })}
                placeholder={t("Mesajını yaz…")}
                placeholderTextColor={colors.placeholder}
                multiline
                textAlignVertical="top"
                accessibilityLabel={t("Mesaj")}
              />
              {!hasPhone ? (
                <Text style={styles.note}>{t("Kayıtlı bir telefon numarası yok; mesajı kopyalayıp istediğin uygulamadan gönderebilirsin.")}</Text>
              ) : null}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[hasPhone ? styles.secondaryBtn : styles.primaryBtn, empty && styles.disabled]}
                onPress={copy}
                disabled={empty}
                accessibilityRole="button"
                accessibilityLabel={t("Kopyala")}
                accessibilityState={{ disabled: empty }}
              >
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={hasPhone ? colors.text : colors.onFill} />
                <Text style={hasPhone ? styles.secondaryText : styles.primaryText} numberOfLines={1}>
                  {copied ? t("Mesaj kopyalandı") : t("Kopyala")}
                </Text>
              </TouchableOpacity>
              {hasPhone ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, empty && styles.disabled]}
                  onPress={whatsapp}
                  disabled={empty}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: empty }}
                  accessibilityHint={t("WhatsApp sohbetini bu taslakla açar; göndermek sende")}
                >
                  <Ionicons name="logo-whatsapp" size={18} color={colors.onFill} />
                  <Text style={styles.primaryText}>{t("WhatsApp’ta aç")}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "90%", backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8, borderTopWidth: 1, borderColor: colors.border,
  },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "600", color: colors.text },
  closeBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginRight: -12 },
  body: { flexGrow: 0 },

  person: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 4 },
  personName: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  personSub: { fontSize: 13, lineHeight: 18, color: colors.textSub },

  label: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: colors.textSub, marginTop: 4 },
  suggestion: {
    minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  suggestionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  suggestionText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  ownRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 },
  ownText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.primary },

  input: {
    minHeight: 96, maxHeight: 180, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, lineHeight: 21, color: colors.text,
  },
  note: { fontSize: 13, lineHeight: 18, color: colors.textSub },

  footer: { flexDirection: "row", gap: 10, paddingTop: 12, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  primaryBtn: {
    flex: 1, minHeight: 48, borderRadius: 8, backgroundColor: colors.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12,
  },
  primaryText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.onFill },
  secondaryBtn: {
    flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12,
  },
  secondaryText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.text },
  disabled: { opacity: 0.45 },
});
