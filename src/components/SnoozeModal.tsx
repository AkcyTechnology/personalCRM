import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";

type PresetOption = { label: string; days: number };

const PRESETS: PresetOption[] = [
  { label: "Yarın",   days: 1 },
  { label: "3 gün",   days: 3 },
  { label: "1 hafta",  days: 7 },
  { label: "2 hafta",  days: 14 },
];

const CUSTOM = "Özel tarih seç";

function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function parseCustomDate(text: string): string | null {
  const match = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return iso;
}

type Props = {
  visible: boolean;
  contactName: string;
  onCancel: () => void;
  onConfirm: (date: string) => void;
};

export default function SnoozeModal({ visible, contactName, onCancel, onConfirm }: Props) {
  const [selected, setSelected] = useState<number | "custom" | null>(null);
  const [customText, setCustomText] = useState("");

  const resetAndCancel = () => {
    setSelected(null);
    setCustomText("");
    onCancel();
  };

  const resolvedDate =
    selected === "custom" ? parseCustomDate(customText)
    : typeof selected === "number" ? daysAhead(selected)
    : null;

  const canConfirm = !!resolvedDate;

  const handleConfirm = () => {
    if (!resolvedDate) return;
    onConfirm(resolvedDate);
    setSelected(null);
    setCustomText("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndCancel}>
      <Pressable style={styles.overlay} onPress={resetAndCancel}>
        <Pressable style={styles.modalBox}>
          <Text style={styles.title}>Ne kadar erteleyelim?</Text>
          <Text style={styles.desc}>
            {contactName ? `${contactName} kişisini ` : ""}seçtiğin tarihte tekrar öncelikli olarak göstereceğiz.
          </Text>

          <View style={styles.optionsGrid}>
            {PRESETS.map((p) => {
              const active = selected === p.days;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => setSelected(p.days)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.option, styles.optionWide, selected === "custom" && styles.optionActive]}
              onPress={() => setSelected("custom")}
              activeOpacity={0.75}
            >
              <Text style={[styles.optionText, selected === "custom" && styles.optionTextActive]}>{CUSTOM}</Text>
            </TouchableOpacity>
          </View>

          {selected === "custom" && (
            <TextInput
              style={styles.customInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="GG/AA/YYYY"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetAndCancel} activeOpacity={0.75}>
              <Text style={styles.cancelBtnText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnOff]}
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={!canConfirm}
            >
              <Text style={styles.confirmBtnText}>Ertele</Text>
            </TouchableOpacity>
          </View>
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
  modalBox: {
    width: "100%", maxWidth: 380,
    backgroundColor: colors.bg, borderRadius: radius.modal, padding: 22,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8, textAlign: "center" },
  desc: { fontSize: 13, color: colors.textSub, textAlign: "center", lineHeight: 19, marginBottom: 18 },

  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    flexGrow: 1, minWidth: "45%",
    paddingVertical: 12, alignItems: "center",
    borderRadius: radius.button,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionWide: { minWidth: "100%" },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { fontSize: 14, fontWeight: "600", color: colors.textSub },
  optionTextActive: { color: colors.primary, fontWeight: "700" },

  customInput: {
    marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    backgroundColor: colors.card, color: colors.text,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },

  buttonRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: radius.button,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: colors.textSub },
  confirmBtn: {
    flex: 1, height: 48, borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  confirmBtnOff: { backgroundColor: colors.primary + "55" },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
