import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import EmptyState from "../components/EmptyState";
import SnoozeModal from "../components/SnoozeModal";
import MessageComposer from "../components/MessageComposer";
import { loadContacts, saveContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import type { ContactForm } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { isSnoozed, isDue, effectiveIntervalDays, neglectScore } from "../utils/reminderInterval";
import { showToast } from "../components/Toast";

const PURPLE = colors.primary;
const BG = colors.bg;
const CARD = colors.card;
const BORDER = colors.border;
const TEXT = colors.text;
const MUTED = colors.textSub;
const RED = colors.danger;
const ORANGE = colors.warning;

function safeDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(iso?: string) {
  const date = safeDate(iso);
  if (!date) return 9999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function nextBirthdayInfo(birthday?: string) {
  if (!birthday) return null;
  const parts = birthday.split(/[./-]/).map(Number);
  let day: number | undefined;
  let month: number | undefined;
  if (parts.length >= 3) {
    if (String(parts[0]).length === 4) { month = parts[1]; day = parts[2]; }
    else { day = parts[0]; month = parts[1]; }
  }
  if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), month - 1, day);
  if (next < today) next.setFullYear(now.getFullYear() + 1);

  const daysLeft = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
  return {
    daysLeft,
    date: next,
    label: daysLeft === 0 ? "Bugün" : `${daysLeft}g sonra`,
  };
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function formatDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function RemindersScreen({ navigation }: any) {
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [threshold, setThreshold] = useState(14);
  const [snoozeTarget, setSnoozeTarget] = useState<ContactForm | null>(null);
  const [composerTarget, setComposerTarget] = useState<ContactForm | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
      });
    }, [])
  );

  const { priority, upcoming } = useMemo(() => {
    const active = contacts.filter((c) => !isSnoozed(c));

    const priority = active
      .filter((c) => isDue(c, threshold))
      .sort((a, b) => neglectScore(b, threshold) - neglectScore(a, threshold))
      .slice(0, 6)
      .map((c) => ({
        contact: c,
        days: daysSince(c.lastContactDate),
      }));

    const upcoming = active
      .map((c) => ({ contact: c, birthday: nextBirthdayInfo(c.birthday) }))
      .filter((x): x is { contact: ContactForm; birthday: NonNullable<ReturnType<typeof nextBirthdayInfo>> } => !!x.birthday && x.birthday.daysLeft <= 30)
      .sort((a, b) => a.birthday.daysLeft - b.birthday.daysLeft)
      .slice(0, 6);

    return { priority, upcoming };
  }, [contacts, threshold]);

  const goToContact = (contact: ContactForm) => navigation.navigate("PersonDetail", { contact });

  const handleSnoozeConfirm = useCallback(async (date: string) => {
    if (!snoozeTarget) return;
    const all = await loadContacts();
    const updated = all.map((c) => {
      const sameId = snoozeTarget.id && c.id === snoozeTarget.id;
      const samePerson = c.fullName === snoozeTarget.fullName && (c.email || "") === (snoozeTarget.email || "");
      return sameId || samePerson ? { ...c, snoozedUntil: date } : c;
    });
    await saveContacts(updated);
    setContacts(updated);
    setSnoozeTarget(null);
    showToast("Hatırlatma ertelendi");
  }, [snoozeTarget]);

  const isEmpty = priority.length === 0 && upcoming.length === 0;

  return (
    <View style={styles.screen}>
      <AppHeader
        type="detail"
        centerTitle="Hatırlatıcılar"
        onBack={() => navigation.goBack()}
        rightActions={[{ label: "＋", onPress: () => navigation.navigate("AddContact") }]}
      />

      {isEmpty ? (
        <EmptyState
          icon="🔔"
          title="Henüz hatırlatıcın yok"
          description="Ulaşmak istediğin kişiler için hatırlatıcı oluşturabilirsin."
          buttonLabel="Hatırlatıcı oluştur"
          onPress={() => navigation.navigate("AddContact")}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {priority.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Öncelikli</Text>

              {priority.map(({ contact, days }) => (
                <TouchableOpacity
                  key={contact.id ?? contact.fullName}
                  style={[styles.priorityCard, { borderLeftColor: days >= effectiveIntervalDays(contact, threshold) * 1.3 ? RED : ORANGE }]}
                  onPress={() => goToContact(contact)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconCircle, { backgroundColor: PURPLE + "15" }]}>
                    <Text style={[styles.iconText, { color: PURPLE }]}>{initials(contact.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{contact.fullName}</Text>
                    <Text style={styles.cardDesc} numberOfLines={1}>
                      {days === 0 ? "Bugün" : days === 1 ? "Dün" : `${days} gündür iletişim yok`}
                    </Text>
                  </View>
                  <View style={styles.cardActionsCol}>
                    <TouchableOpacity
                      style={styles.rescheduleBtn}
                      onPress={() => setSnoozeTarget(contact)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.rescheduleBtnText}>Yeniden planla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.messageBtn}
                      onPress={() => setComposerTarget(contact)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.messageBtnText}>Mesaj hazırla</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Yaklaşanlar</Text>

              {upcoming.map(({ contact, birthday }) => (
                <TouchableOpacity
                  key={contact.id ?? contact.fullName}
                  style={styles.upcomingCard}
                  onPress={() => goToContact(contact)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(contact.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{contact.fullName}</Text>
                    <Text style={styles.cardDesc}>Doğum günü</Text>
                  </View>
                  <View style={styles.dateArea}>
                    <Text style={styles.dateText}>{formatDate(birthday.date)}</Text>
                    <Text style={styles.leftText}>{birthday.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <SnoozeModal
        visible={!!snoozeTarget}
        contactName={snoozeTarget?.fullName ?? ""}
        onCancel={() => setSnoozeTarget(null)}
        onConfirm={handleSnoozeConfirm}
      />

      <MessageComposer
        visible={!!composerTarget}
        contact={composerTarget}
        onClose={() => setComposerTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 22, paddingBottom: 100, paddingTop: 16 },
  sectionLabel: {
    marginTop: 10, marginBottom: 12,
    fontSize: 12, color: MUTED, fontWeight: "900",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  priorityCard: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, borderLeftWidth: 4,
    padding: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  iconText: { fontSize: 14, fontWeight: "900" },
  cardTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  cardDesc: { marginTop: 4, fontSize: 12, color: MUTED },
  cardActionsCol: { marginLeft: 10, gap: 6, alignItems: "flex-end" },
  rescheduleBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  rescheduleBtnText: { fontSize: 11, fontWeight: "800", color: PURPLE },
  messageBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFF1E6",
  },
  messageBtnText: { fontSize: 11, fontWeight: "800", color: ORANGE },
  upcomingCard: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFF1D6", alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  avatarText: { color: ORANGE, fontWeight: "900", fontSize: 13 },
  dateArea: { alignItems: "flex-end" },
  dateText: { color: TEXT, fontSize: 13, fontWeight: "900" },
  leftText: { marginTop: 5, color: ORANGE, fontSize: 11, fontWeight: "700" },
});
