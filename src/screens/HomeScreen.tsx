import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { loadContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import type { ContactForm } from "./AddContactScreen";

const PURPLE = "#7C3AED";
const BG     = "#FAF9FF";
const CARD   = "#FFFFFF";
const BORDER = "#ECE8F7";
const TEXT   = "#191826";
const MUTED  = "#8E8AA3";
const ORANGE = "#F59E0B";
const RED    = "#EF4444";

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function avatarColor(name: string) {
  const palette = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#0891B2", "#9333EA"];
  let h = 0; for (const c of name) h += c.charCodeAt(0);
  return palette[h % palette.length];
}

function daysSince(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86_400_000);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [contacts,  setContacts]  = useState<ContactForm[]>([]);
  const [threshold, setThreshold] = useState(14);

  useFocusEffect(useCallback(() => {
    Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
      setContacts(c);
      setThreshold(s.reachOutThresholdDays);
    });
  }, []));

  // Eşik süreyi aşmış kişiler → "Reach out today"
  const reachOut = contacts
    .filter(c => daysSince(c.lastContactDate) >= threshold)
    .sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate));

  // Yaklaşan: eşiğin %70'ine gelmiş ama henüz geçmemiş kişiler
  const upcoming = contacts
    .filter(c => {
      const d = daysSince(c.lastContactDate);
      return d >= Math.floor(threshold * 0.7) && d < threshold;
    })
    .sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Merhaba, Tuğçe 👋</Text>
            <Text style={styles.subtitle}>İlişkilerini her gün besle.</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate("Reminders")}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* ── Reach Out Today ── */}
        {reachOut.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ulaş ({reachOut.length})</Text>
              <TouchableOpacity onPress={() => navigation.navigate("People")}>
                <Text style={styles.seeAll}>Tümünü gör</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reachRow}
            >
              {reachOut.map((c, i) => {
                const color = avatarColor(c.fullName);
                const days  = daysSince(c.lastContactDate);
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.reachCard}
                    onPress={() => navigation.navigate("PersonDetail", { contact: c })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.reachTop}>
                      <View style={[styles.avatar, { backgroundColor: color + "20", borderColor: color + "40" }]}>
                        <Text style={[styles.avatarText, { color }]}>{initials(c.fullName)}</Text>
                      </View>
                      <View style={[styles.scoreWrap, { borderColor: days > 30 ? RED : ORANGE }]}>
                        <Text style={[styles.score, { color: days > 30 ? RED : ORANGE }]}>{days}g</Text>
                      </View>
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>{c.fullName}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>{c.relationship}</Text>
                    <View style={styles.notePill}>
                      <Text style={styles.noteText}>{days > 30 ? "Uzun süredir görüşülmedi" : "Görüşme zamanı"}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Upcoming ── */}
        {upcoming.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yaklaşıyor</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Reminders")}>
                <Text style={styles.seeAll}>Tümünü gör</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.upcomingList}>
              {upcoming.map((c, i) => {
                const color = avatarColor(c.fullName);
                const days  = daysSince(c.lastContactDate);
                const daysLeft = threshold - days;
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.upcomingCard}
                    onPress={() => navigation.navigate("PersonDetail", { contact: c })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.avatarSmall, { backgroundColor: color + "20", borderColor: color + "40" }]}>
                      <Text style={[styles.avatarText, { color }]}>{initials(c.fullName)}</Text>
                    </View>
                    <View style={styles.upcomingInfo}>
                      <Text style={styles.upcomingName}>{c.fullName}</Text>
                      <Text style={styles.upcomingDetail}>
                        {[c.jobTitle, c.company].filter(Boolean).join(" · ") || c.relationship}
                      </Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: ORANGE + "18" }]}>
                      <Text style={[styles.tagText, { color: ORANGE }]}>{daysLeft}g kaldı</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Boş durum */}
        {reachOut.length === 0 && upcoming.length === 0 && contacts.length > 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>Harika gidiyorsun!</Text>
            <Text style={styles.emptyDesc}>
              Tüm kişilerinle son {threshold} gün içinde iletişime geçmişsin.
            </Text>
          </View>
        )}

        {contacts.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>Henüz kişi yok</Text>
            <Text style={styles.emptyDesc}>
              + butonuna basarak ilk kişini ekle.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 20, paddingBottom: 110 },

  // Header
  header: { flexDirection: "row", alignItems: "center" },
  greeting: { fontSize: 20, fontWeight: "800", color: TEXT },
  subtitle: { marginTop: 3, fontSize: 13, color: MUTED },
  notifBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: CARD, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER,
  },
  notifIcon: { fontSize: 18 },
  notifDot: {
    position: "absolute", top: 9, right: 9,
    width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE,
  },

  // Section
  sectionHeader: {
    marginTop: 24, marginBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  seeAll: { color: PURPLE, fontSize: 13, fontWeight: "700" },

  // Reach Out Cards
  reachRow: { gap: 12, paddingBottom: 4, paddingRight: 4 },
  reachCard: {
    width: 148, backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER,
    shadowColor: "#A78BFA", shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  reachTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  avatarSmall: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontWeight: "800", fontSize: 14 },
  scoreWrap: {
    width: 36, height: 36, borderRadius: 8,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
  },
  score: { fontSize: 10, fontWeight: "800" },
  cardName: { marginTop: 12, fontSize: 14, fontWeight: "800", color: TEXT },
  cardSub: { marginTop: 2, fontSize: 11, color: MUTED },
  notePill: {
    marginTop: 10, borderRadius: 8, backgroundColor: "#F1ECFF",
    paddingHorizontal: 9, paddingVertical: 6,
  },
  noteText: { color: PURPLE, fontSize: 10, fontWeight: "700" },

  // Upcoming
  upcomingList: { gap: 8 },
  upcomingCard: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 12, flexDirection: "row", alignItems: "center", gap: 12,
  },
  upcomingInfo: { flex: 1 },
  upcomingName: { fontSize: 14, fontWeight: "800", color: TEXT },
  upcomingDetail: { marginTop: 2, fontSize: 12, color: MUTED },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "700" },

  // Empty
  emptyCard: {
    marginTop: 48, alignItems: "center", gap: 8, paddingHorizontal: 16,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: TEXT },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 20 },
});
