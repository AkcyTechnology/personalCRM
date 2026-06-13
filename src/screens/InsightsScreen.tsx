import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { loadContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import insightsJson from "../data/insightsData.json";
import type { ContactForm } from "./AddContactScreen";

const PURPLE = "#7C3AED";
const BG     = "#FAF9FF";
const CARD   = "#FFFFFF";
const BORDER = "#ECE8F7";
const TEXT   = "#191826";
const MUTED  = "#8E8AA3";
const GREEN  = "#22C55E";
const ORANGE = "#F59E0B";
const RED    = "#EF4444";

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function avatarColor(name: string) {
  const p = ["#7C3AED","#2563EB","#059669","#D97706","#0891B2","#9333EA"];
  let h = 0; for (const c of name) h += c.charCodeAt(0);
  return p[h % p.length];
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();

  const [contacts,  setContacts]  = useState<ContactForm[]>([]);
  const [threshold, setThreshold] = useState(14);

  useFocusEffect(useCallback(() => {
    Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
      setContacts(c);
      setThreshold(s.reachOutThresholdDays);
    });
  }, []));

  // ── Hesaplanan metrikler ──────────────────────────────────────────────────
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

  // Bu hafta iletişime geçilenler (lastContactDate son 7 gün içinde)
  const contactedThisWeek = contacts.filter(c =>
    new Date(c.lastContactDate) >= weekStart
  );

  // Eşiği aşmış → ulaş listesi
  const needsAttention = contacts
    .filter(c => daysSince(c.lastContactDate) >= threshold)
    .sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate));

  // Sağlık skoru: ortalama "tazelik" puanı (0-100)
  const healthScore = contacts.length === 0 ? 0 : Math.round(
    contacts.reduce((sum, c) => {
      const d = daysSince(c.lastContactDate);
      return sum + Math.max(0, 100 - Math.round((d / threshold) * 100));
    }, 0) / contacts.length
  );

  // Weekly summary metni
  const summaryDesc = insightsJson.summary.descriptionTemplate
    .replace("{contactedCount}", String(contactedThisWeek.length))
    .replace("{weeklyChange}", `+${insightsJson.summary.weeklyChange}`);

  // Health trend: JSON'dan al ama son değeri gerçek skorla güncelle
  const healthTrend = insightsJson.healthTrend.map((item, i, arr) =>
    i === arr.length - 1 ? { ...item, value: healthScore } : item
  );

  const maxTrend = Math.max(...healthTrend.map(i => i.value), 1);
  const maxComm  = Math.max(...insightsJson.communication.map(i => i.count), 1);

  const stats = [
    { label: "Toplam kişi",          value: contacts.length,          change: "+0" },
    { label: "Bu hafta iletişim",    value: contactedThisWeek.length, change: `+${insightsJson.summary.weeklyChange}` },
    { label: "Bekleyen hatırlatma",  value: needsAttention.length,    change: needsAttention.length > 0 ? `+${needsAttention.length}` : "0" },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Insights</Text>

        {/* ── Weekly Summary ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>HAFTALIK ÖZET</Text>
          <Text style={styles.summaryText}>{summaryDesc}</Text>
          <View style={styles.summaryStats}>
            <MiniStat label="Sağlık" value={healthScore} suffix="/100" />
            <MiniStat label="Değişim" value={insightsJson.summary.weeklyChange} prefix="+" />
            <MiniStat label="En iyi" value={insightsJson.summary.bestImprovementValue} prefix="+" />
          </View>
        </View>

        {/* ── Stat Cards ── */}
        <View style={styles.statsGrid}>
          {stats.map(item => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={[styles.statChange, item.change.startsWith("-") && { color: RED }]}>
                {item.change}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Health Trend Chart ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>İlişki Sağlığı Trendi</Text>
          <Text style={styles.cardSubtitle}>Son 5 ay — son değer anlık hesaplama</Text>
          <View style={styles.lineChart}>
            {healthTrend.map((item, idx) => {
              const isLast = idx === healthTrend.length - 1;
              return (
                <View key={item.month} style={styles.lineItem}>
                  <Text style={[styles.chartValue, isLast && { color: PURPLE, fontWeight: "700" }]}>
                    {item.value}
                  </Text>
                  <View style={[
                    styles.lineDot,
                    { marginTop: 90 - Math.round((item.value / maxTrend) * 70) },
                    isLast && { backgroundColor: GREEN, width: 14, height: 14, borderRadius: 7 },
                  ]} />
                  <Text style={[styles.chartLabel, isLast && { color: PURPLE }]}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Communication Bar Chart ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bu Hafta İletişim</Text>
          <Text style={styles.cardSubtitle}>Günlük etkileşim sayısı</Text>
          <View style={styles.barChart}>
            {insightsJson.communication.map((item, idx) => (
              <View key={`${item.day}-${idx}`} style={styles.barItem}>
                <View style={[styles.bar, { height: 18 + Math.round((item.count / maxComm) * 56) }]} />
                <Text style={styles.chartLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Öngörüler (JSON) ── */}
        <Text style={styles.sectionTitle}>Öngörüler</Text>
        {insightsJson.recommendations.map(item => (
          <View key={item.title} style={styles.recommendationCard}>
            <View style={[styles.levelDot, getLevelStyle(item.level)]} />
            <View style={styles.recommendationInfo}>
              <Text style={styles.recommendationTitle}>{item.level} · {item.title}</Text>
              <Text style={styles.recommendationDesc}>{item.description}</Text>
            </View>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>{item.action}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* ── Dikkat Gereken Kişi (gerçek veri) ── */}
        {needsAttention.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Dikkat Gerekiyor</Text>
            {needsAttention.slice(0, 3).map((c, i) => {
              const color = avatarColor(c.fullName);
              const days  = daysSince(c.lastContactDate);
              return (
                <View key={i} style={styles.warningCard}>
                  <View style={[styles.warningAvatar, { backgroundColor: color + "20" }]}>
                    <Text style={[styles.warningAvatarText, { color }]}>{initials(c.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warningTitle}>{days > 30 ? "Uzun süredir yok" : "Yakında eşik"}</Text>
                    <Text style={styles.warningName}>{c.fullName}</Text>
                    <Text style={styles.warningDesc}>{days} gündür iletişim yok</Text>
                  </View>
                  <TouchableOpacity style={styles.warningButton}>
                    <Text style={styles.warningButtonText}>Ulaş</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MiniStat({ label, value, prefix = "", suffix = "" }: {
  label: string; value: number; prefix?: string; suffix?: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{prefix}{value}{suffix}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function getLevelStyle(level: string) {
  if (level === "High")   return { backgroundColor: RED };
  if (level === "Medium") return { backgroundColor: ORANGE };
  return { backgroundColor: GREEN };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 22, paddingBottom: 120 },

  title: { fontSize: 26, fontWeight: "900", color: TEXT, marginBottom: 22 },

  summaryCard: {
    backgroundColor: "#9B7CFF", borderRadius: 18, padding: 20,
    shadowColor: PURPLE, shadowOpacity: 0.22, shadowRadius: 16, elevation: 7,
  },
  summaryLabel: { color: "#F3EFFF", fontSize: 11, fontWeight: "900", marginBottom: 10, letterSpacing: 0.8 },
  summaryText: { color: "#FFFFFF", fontSize: 14, lineHeight: 21, fontWeight: "600" },
  summaryStats: { flexDirection: "row", marginTop: 16, gap: 10 },
  miniStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, padding: 11 },
  miniValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  miniLabel: { color: "#EFEAFF", fontSize: 11, marginTop: 3 },

  statsGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
  statCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 13,
  },
  statValue: { fontSize: 22, fontWeight: "900", color: TEXT },
  statLabel: { marginTop: 5, fontSize: 11, color: MUTED },
  statChange: { marginTop: 7, color: GREEN, fontSize: 12, fontWeight: "800" },

  card: {
    marginTop: 16, backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
  cardSubtitle: { marginTop: 3, fontSize: 11, color: MUTED },

  lineChart: { height: 140, marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  lineItem: { alignItems: "center", flex: 1 },
  chartValue: { fontSize: 10, color: MUTED },
  lineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PURPLE },
  chartLabel: { marginTop: 7, fontSize: 11, color: MUTED, fontWeight: "700" },

  barChart: {
    marginTop: 18, height: 100,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  barItem: { alignItems: "center", flex: 1 },
  bar: { width: 22, borderRadius: 6, backgroundColor: "#8B5CF6" },

  sectionTitle: { marginTop: 22, marginBottom: 12, fontSize: 16, fontWeight: "800", color: TEXT },

  recommendationCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10,
  },
  levelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  recommendationInfo: { flex: 1 },
  recommendationTitle: { fontSize: 13, color: TEXT, fontWeight: "800" },
  recommendationDesc: { marginTop: 4, fontSize: 12, color: MUTED, lineHeight: 17 },
  actionButton: { backgroundColor: "#F1ECFF", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  actionText: { color: PURPLE, fontSize: 12, fontWeight: "800" },

  warningCard: {
    backgroundColor: "#FFF7F7", borderColor: "#FFE1E1", borderWidth: 1,
    borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center",
    marginBottom: 10,
  },
  warningAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  warningAvatarText: { fontWeight: "900", fontSize: 14 },
  warningTitle: { color: RED, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  warningName: { marginTop: 3, color: TEXT, fontSize: 13, fontWeight: "800" },
  warningDesc: { marginTop: 2, color: MUTED, fontSize: 11 },
  warningButton: { backgroundColor: PURPLE, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  warningButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
