import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { loadSettings, updateSettings } from "../data/userSettings";
import { GOALS } from "../data/goals";
import { t } from "../i18n";
import { loadContacts } from "../data/contacts";
import type { ContactForm } from "./AddContactScreen";
import { connectionStatus, healthScoreColor, healthScoreLabel, MIN_SCORED_PEOPLE } from "../utils/healthScore";
import { dueContacts, hasAnyHistory, weekStats } from "../utils/stats";
import HealthInfoModal from "../components/HealthInfoModal";
import Avatar from "../components/Avatar";
import GoalIcon from "../components/GoalIcon";
import InsightsSection from "./InsightsScreen";
import { colors } from "../theme/colors";

const TOP_SAFE = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 48;

/**
 * Profile, top to bottom: who you are and your numbers, İçgörüler (moved here
 * from Evren), usage purposes, then a link to Hesap ayarları. Every metric
 * appears once on this page.
 */
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top + 8 : TOP_SAFE;

  const [loaded, setLoaded] = useState(false);
  const [threshold, setThreshold] = useState(14);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [goals, setGoals] = useState<string[]>([]);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [userAvatarId, setUserAvatarId] = useState<string | undefined>(undefined);
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSettings(), loadContacts()]).then(([s, list]) => {
        setThreshold(s.reachOutThresholdDays || 14);
        setWeeklyGoal(s.weeklyGoal || 3);
        setUserName(s.userName || "");
        setEmail(s.email || "");
        setUserAvatarId(s.userAvatarId);
        setGoals(s.goals || []);
        setContacts(list);
        setLoaded(true);
      });
    }, [])
  );

  // Same keys as before; only the display changed.
  const toggleGoal = async (key: string) => {
    const next = goals.includes(key) ? goals.filter((g) => g !== key) : [...goals, key];
    setGoals(next);
    await updateSettings({ goals: next });
  };

  // Same sources as Home and the İçgörüler section, so the numbers agree.
  const week = useMemo(() => weekStats(contacts, weeklyGoal), [contacts, weeklyGoal]);
  const dueCount = useMemo(() => dueContacts(contacts, threshold).length, [contacts, threshold]);
  const status = useMemo(() => connectionStatus(contacts, threshold), [contacts, threshold]);
  const known = useMemo(() => hasAnyHistory(contacts), [contacts]);
  const health = status.score;
  const healthColor = healthScoreColor(health);

  return (
    <View style={styles.screen}>
      {/* ── Profile ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <Avatar name={userName} avatarId={userAvatarId} size={52} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">{userName || t("Profil")}</Text>
            {email ? <Text style={styles.headerEmail} numberOfLines={1}>{email}</Text> : null}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("ProfileSettings")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("Profili düzenle")}
          >
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!loaded ? null : contacts.length === 0 ? (
          /* No people yet: one short empty state instead of zero cards. */
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={24} color={colors.textSub} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>{t("Henüz kişi eklemedin")}</Text>
              <Text style={styles.emptyText}>{t("İlk kişini eklediğinde özetlerin ve içgörülerin burada görünür.")}</Text>
            </View>
            <TouchableOpacity style={styles.smallBtn} onPress={() => navigation.navigate("AddContact")} accessibilityRole="button">
              <Text style={styles.smallBtnText}>{t("Kişi ekle")}</Text>
            </TouchableOpacity>
          </View>
        ) : !known ? (
          /* People, but no moments yet: show the count and say what comes next. */
          <View style={styles.noteCard}>
            <View style={styles.noteTop}>
              <Text style={styles.statValue}>{contacts.length}</Text>
              <Text style={styles.noteLabel}>{t("Toplam kişi")}</Text>
            </View>
            <Text style={styles.emptyText}>
              {t("Bir görüşmeyi “Görüştüm” ile kaydettiğinde bu haftaki görüşmeler ve bağlarının durumu burada görünür.")}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard value={contacts.length} label={t("Toplam kişi")} />
              <StatCard value={week.moments} label={t("Bu haftaki görüşmeler")} />
              <StatCard value={dueCount} label={t("Görüşme zamanı gelen")} />
            </View>

            <View style={styles.healthCard}>
              <View style={styles.healthLeft}>
                <View style={styles.healthLabelRow}>
                  <Text style={styles.healthLabel}>{t("Bağlarının durumu")}</Text>
                  <TouchableOpacity
                    onPress={() => setHealthInfoOpen(true)}
                    style={styles.infoBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t("Bağlarının durumu nasıl hesaplanır?")}
                  >
                    <Ionicons name="information-circle-outline" size={18} color={colors.textSub} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.healthSub}>
                  {health === null
                    ? t("Henüz yeterli veri yok: en az {min} kişi için görüşme kaydı gerekiyor ({count} var).", { min: MIN_SCORED_PEOPLE, count: status.scored })
                    : t("{label} · {count} kişinin görüşme kayıtlarına göre", { label: t(healthScoreLabel(health)), count: status.scored })}
                </Text>
                {health !== null ? (
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${health}%` as `${number}%`, backgroundColor: healthColor }]} />
                  </View>
                ) : null}
              </View>
              {health !== null ? (
                <View style={styles.healthRight}>
                  <Text style={[styles.healthScore, { color: healthColor }]}>{health}</Text>
                  <Text style={styles.healthSuffix}>/100</Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        {/* ── İçgörüler ── */}
        {loaded && contacts.length > 0 ? (
          <>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t("İçgörüler")}</Text>
            <InsightsSection navigation={navigation} />
          </>
        ) : null}

        {/* ── Usage purposes ── */}
        <Text style={styles.sectionTitle} accessibilityRole="header">{t("Kullanım amaçların")}</Text>
        <View style={styles.goalsWrap}>
          {GOALS.map((g) => {
            const active = goals.includes(g.key);
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.goalChip, active && styles.goalChipActive]}
                onPress={() => toggleGoal(g.key)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                aria-checked={active}
                accessibilityLabel={t(g.short)}
              >
                <GoalIcon goal={g.key} size={16} color={active ? colors.primary : colors.textSub} />
                <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>{t(g.short)}</Text>
                {active ? <Ionicons name="checkmark" size={14} color={colors.primary} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Account settings ── */}
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => navigation.navigate("AccountSettings")}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t("Hesap ayarları")}
          accessibilityHint={t("Bildirimler, gizlilik, dil, görünüm ve yedekler")}
        >
          <View style={styles.settingsIcon}>
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingsInfo}>
            <Text style={styles.settingsTitle}>{t("Hesap ayarları")}</Text>
            <Text style={styles.settingsSub}>{t("Bildirimler, gizlilik, dil, görünüm ve yedekler")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />
    </View>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCard} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const card = {
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerInfo: { flex: 1, minWidth: 0 },
  headerName: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: colors.text },
  headerEmail: { marginTop: 1, fontSize: 13, lineHeight: 18, color: colors.textSub },
  editBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  statCard: { ...card, flex: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12 },
  statValue: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: colors.text },
  statLabel: { marginTop: 2, fontSize: 13, lineHeight: 17, color: colors.textSub },

  healthCard: { ...card, flexDirection: "row", alignItems: "center", padding: 14 },
  healthLeft: { flex: 1, marginRight: 12 },
  healthLabelRow: { flexDirection: "row", alignItems: "center" },
  healthLabel: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  infoBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginVertical: -10 },
  healthSub: { fontSize: 13, lineHeight: 18, color: colors.textSub, marginTop: 2 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.borderLight, marginTop: 10, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  healthRight: { flexDirection: "row", alignItems: "flex-end" },
  healthScore: { fontSize: 26, fontWeight: "700" },
  healthSuffix: { fontSize: 13, color: colors.textMuted, marginBottom: 3 },

  emptyCard: { ...card, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  emptyText: { fontSize: 13, lineHeight: 18, color: colors.textSub, marginTop: 2 },
  smallBtn: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  smallBtnText: { fontSize: 14, fontWeight: "700", color: colors.onFill },
  noteCard: { ...card, padding: 14, gap: 6 },
  noteTop: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  noteLabel: { fontSize: 13, color: colors.textSub },

  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 10 },

  goalsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChip: {
    minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  goalChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  goalChipText: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: colors.text },
  goalChipTextActive: { color: colors.primary, fontWeight: "700" },

  settingsRow: { ...card, marginTop: 24, minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  settingsInfo: { flex: 1, minWidth: 0 },
  settingsTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  settingsSub: { fontSize: 13, lineHeight: 18, color: colors.textSub },
});
