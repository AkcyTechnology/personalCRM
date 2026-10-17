import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, TextInput } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { birthdayToDate, formatBirthday, formatLongTR, parseISODate, toISODate } from "../utils/dates";

type Props = {
  label?: string;
  /** "iso" stores YYYY-MM-DD, "birthday" stores DD/MM/YYYY */
  format: "iso" | "birthday";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  error?: string;
  clearable?: boolean;
};

/** A tappable date field backed by the native date picker (no typing formats). */
export default function DateField({
  label, format, value, onChange, placeholder = "Tarih seç", maximumDate, minimumDate, error, clearable = true,
}: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = format === "iso" ? parseISODate(value) : birthdayToDate(value);
  const [draft, setDraft] = useState<Date>(current ?? maximumDate ?? new Date());

  const commit = (d: Date) => onChange(format === "iso" ? toISODate(d) : formatBirthday(d));

  const open = () => {
    const initial = current ?? (format === "birthday" ? new Date(1995, 0, 1) : new Date());
    if (Platform.OS === "android") {
      const { DateTimePickerAndroid } = require("@react-native-community/datetimepicker");
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        maximumDate,
        minimumDate,
        onValueChange: (_e: unknown, d: Date) => d && commit(d),
      });
    } else {
      setDraft(initial);
      setIosOpen(true);
    }
  };

  const display = current ? formatLongTR(current) : "";

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          style={[styles.field, styles.webInput, !!error && styles.fieldError]}
          value={value}
          onChangeText={onChange}
          placeholder={format === "iso" ? "YYYY-AA-GG" : "GG/AA/YYYY"}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const DateTimePicker = Platform.OS === "ios" ? require("@react-native-community/datetimepicker").default : null;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.field, !!error && styles.fieldError]}
        onPress={open}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? "Tarih"}: ${display || "seçilmedi"}`}
        accessibilityHint="Tarih seçiciyi açar"
      >
        <Ionicons name="calendar-outline" size={18} color={current ? colors.primary : colors.textMuted} />
        <Text style={[styles.value, !current && styles.placeholder]}>{display || placeholder}</Text>
        {clearable && current ? (
          <TouchableOpacity
            onPress={() => onChange("")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Tarihi temizle"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {DateTimePicker ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text style={styles.sheetTitle}>{label ?? "Tarih seç"}</Text>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                locale="tr-TR"
                accentColor={colors.primary}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onValueChange={(_e: unknown, d: Date) => d && setDraft(d)}
              />
              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setIosOpen(false)}>
                  <Text style={styles.secondaryText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    commit(draft);
                    setIosOpen(false);
                  }}
                >
                  <Text style={styles.primaryText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSub, marginBottom: 6 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    backgroundColor: colors.bg, paddingHorizontal: 14, minHeight: 48,
  },
  webInput: { fontSize: 15, color: colors.text },
  fieldError: { borderColor: colors.danger },
  value: { flex: 1, fontSize: 15, color: colors.text },
  placeholder: { color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.45)", justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: colors.bg, borderRadius: 20, padding: 16 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 6 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  secondaryBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.card, alignItems: "center" },
  secondaryText: { fontSize: 15, fontWeight: "600", color: colors.textSub },
  primaryBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" },
  primaryText: { fontSize: 15, fontWeight: "700", color: colors.white },
});
