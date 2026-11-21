import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ContactForm } from "../screens/AddContactScreen";
import { addReminder, addSpecialDay, completeReminder, deleteReminder, deleteSpecialDay, snoozeReminder } from "../data/contacts";
import { addDays, formatLongTR, nextBirthday, parseISODate, toISODate } from "../utils/dates";
import { askNotificationPermissionWithContext } from "../utils/notifications";
import { confirmDialog } from "../utils/confirm";
import DateField from "./DateField";
import { showToast } from "./Toast";
import { colors } from "../theme/colors";
import { t } from "../i18n";

const TIMES = ["09:00", "12:00", "18:00", "20:00"];

type Props = { contact: ContactForm; onChange: (c: ContactForm) => void };

/**
 * Dated reminders ("call about the flat on the 12th") and special days
 * (anniversary, name day) for one person. Completing a reminder is not a
 * logged moment; that stays a separate, explicit "Görüştüm".
 */
export default function ContactReminders({ contact, onChange }: Props) {
  const [adding, setAdding] = useState<null | "reminder" | "day">(null);
  const open = (contact.reminders ?? []).filter((r) => !r.done);
  const days = contact.specialDays ?? [];
  const id = contact.id;

  const apply = (saved?: ContactForm) => {
    if (saved) onChange(saved);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t("Hatırlatıcılar")}</Text>
        <TouchableOpacity onPress={() => setAdding("reminder")} accessibilityRole="button" style={styles.addBtn}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addText}>{t("Hatırlatıcı ekle")}</Text>
        </TouchableOpacity>
      </View>
      {open.length === 0 ? (
        <Text style={styles.empty}>{t("Belirli bir gün için hatırlatıcı yok.")}</Text>
      ) : (
        open.map((r) => (
          <View key={r.id} style={styles.item}>
            <Ionicons name="alarm-outline" size={18} color={colors.primary} />
            <View style={styles.itemText}>
              <Text style={styles.itemTitle} numberOfLines={2}>{r.note || t("Hatırlatıcı")}</Text>
              <Text style={styles.itemSub}>{`${formatLongTR(parseISODate(r.date) ?? new Date())} · ${r.time}`}</Text>
            </View>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={async () => { if (id) { apply(await completeReminder(id, r.id)); showToast(t("Hatırlatıcı tamamlandı")); } }}
              accessibilityRole="button"
              accessibilityLabel={t("Tamamlandı")}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={async () => { if (id) { apply(await snoozeReminder(id, r.id, 1)); showToast(t("Yarına ertelendi")); } }}
              accessibilityRole="button"
              accessibilityLabel={t("Yarına ertele")}
            >
              <Ionicons name="time-outline" size={22} color={colors.textSub} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                confirmDialog(t("Hatırlatıcı silinsin mi?"), undefined, [
                  { text: t("Vazgeç"), style: "cancel" },
                  { text: t("Sil"), style: "destructive", onPress: async () => { if (id) apply(await deleteReminder(id, r.id)); } },
                ])
              }
              accessibilityRole="button"
              accessibilityLabel={t("Sil")}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={[styles.header, { marginTop: 14 }]}>
        <Text style={styles.title} accessibilityRole="header">{t("Özel günler")}</Text>
        <TouchableOpacity onPress={() => setAdding("day")} accessibilityRole="button" style={styles.addBtn}>
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addText}>{t("Özel gün ekle")}</Text>
        </TouchableOpacity>
      </View>
      {days.length === 0 ? (
        <Text style={styles.empty}>{t("Doğum günü dışında kayıtlı özel gün yok.")}</Text>
      ) : (
        days.map((d) => {
          const next = nextBirthday(d.date);
          return (
            <View key={d.id} style={styles.item}>
              <Ionicons name="gift-outline" size={18} color={colors.warmStrong} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle} numberOfLines={1}>{d.label}</Text>
                <Text style={styles.itemSub}>{next ? formatLongTR(next) : d.date}</Text>
              </View>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() =>
                  confirmDialog(t("Özel gün silinsin mi?"), undefined, [
                    { text: t("Vazgeç"), style: "cancel" },
                    { text: t("Sil"), style: "destructive", onPress: async () => { if (id) apply(await deleteSpecialDay(id, d.id)); } },
                  ])
                }
                accessibilityRole="button"
                accessibilityLabel={t("Sil")}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <AddSheet
        kind={adding}
        name={contact.fullName}
        onClose={() => setAdding(null)}
        onSaveReminder={async (date, time, note) => {
          setAdding(null);
          if (!id) return;
          apply(await addReminder(id, { date, time, note }));
          showToast(t("Hatırlatıcı eklendi"));
          askNotificationPermissionWithContext();
        }}
        onSaveDay={async (label, date) => {
          setAdding(null);
          if (!id) return;
          apply(await addSpecialDay(id, { label, date }));
          showToast(t("Özel gün eklendi"));
          askNotificationPermissionWithContext();
        }}
      />
    </View>
  );
}

export function AddSheet({
  kind,
  name,
  onClose,
  onSaveReminder,
  onSaveDay,
  initialDate,
}: {
  kind: null | "reminder" | "day";
  /** Day to start on (e.g. the day picked on a week strip); past days fall back to tomorrow. */
  initialDate?: string;
  name: string;
  onClose: () => void;
  onSaveReminder: (date: string, time: string, note: string) => void;
  onSaveDay: (label: string, date: string) => void;
}) {
  const [date, setDate] = useState(toISODate(addDays(new Date(), 1)));
  useEffect(() => {
    if (kind === "reminder") {
      const today = toISODate(new Date());
      setDate(initialDate && initialDate >= today ? initialDate : toISODate(addDays(new Date(), 1)));
    }
  }, [kind, initialDate]);
  const [time, setTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [label, setLabel] = useState("");
  const [day, setDay] = useState("");

  const close = () => {
    setNote("");
    setLabel("");
    setDay("");
    onClose();
  };

  return (
    <Modal visible={kind !== null} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {kind === "reminder" ? (
              <>
                <Text style={styles.sheetTitle} accessibilityRole="header">{t("{name} için hatırlatıcı", { name })}</Text>
                <DateField label={t("Gün")} format="iso" value={date} onChange={(v) => setDate(v || date)} minimumDate={new Date()} clearable={false} />
                <Text style={styles.label}>{t("Saat")}</Text>
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {TIMES.map((tm) => (
                    <TouchableOpacity
                      key={tm}
                      style={[styles.chip, time === tm && styles.chipOn]}
                      onPress={() => setTime(tm)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: time === tm }}
                    >
                      <Text style={[styles.chipText, time === tm && styles.chipTextOn]}>{tm}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>{t("Not")}</Text>
                <TextInput
                  style={styles.input}
                  value={note}
                  onChangeText={setNote}
                  placeholder={t("Örn. Yeni işini sor")}
                  placeholderTextColor={colors.placeholder}
                  accessibilityLabel={t("Hatırlatıcı notu")}
                  maxLength={300}
                />
                <TouchableOpacity style={styles.save} onPress={() => { onSaveReminder(date, time, note); setNote(""); }} accessibilityRole="button">
                  <Text style={styles.saveText}>{t("Hatırlatıcıyı kaydet")}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle} accessibilityRole="header">{t("{name} için özel gün", { name })}</Text>
                <Text style={styles.label}>{t("Ne günü?")}</Text>
                <TextInput
                  style={styles.input}
                  value={label}
                  onChangeText={setLabel}
                  placeholder={t("Örn. Evlilik yıl dönümü")}
                  placeholderTextColor={colors.placeholder}
                  accessibilityLabel={t("Özel günün adı")}
                  maxLength={60}
                />
                <DateField label={t("Tarih")} format="birthday" value={day} onChange={setDay} />
                <TouchableOpacity
                  style={[styles.save, (!label.trim() || !day) && { opacity: 0.45 }]}
                  disabled={!label.trim() || !day}
                  onPress={() => { onSaveDay(label, day); setLabel(""); setDay(""); }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !label.trim() || !day }}
                >
                  <Text style={styles.saveText}>{t("Özel günü kaydet")}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.cancel} onPress={close} accessibilityRole="button">
              <Text style={styles.cancelText}>{t("Vazgeç")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: 6 },
  addText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  empty: { fontSize: 14, color: colors.textSub, paddingVertical: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  itemSub: { fontSize: 13, color: colors.textSub, marginTop: 2 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 19, fontWeight: "800", color: colors.text, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textSub, marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.textSub },
  chipTextOn: { color: colors.primary },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, fontSize: 15, color: colors.text, backgroundColor: colors.card },
  save: { marginTop: 18, minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  saveText: { color: colors.onFill, fontSize: 16, fontWeight: "700" },
  cancel: { marginTop: 6, minHeight: 46, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.textSub, fontSize: 15, fontWeight: "700" },
});
