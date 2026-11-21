import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { loadSettings } from "../data/userSettings";
import { t, tv } from "../i18n";
import { loadContacts, subscribeContacts } from "../data/contacts";
import type { ContactForm } from "./AddContactScreen";
import { hasAnyHistory, weekStats } from "../utils/stats";
import { badges, currentWeek, dailyPeople, nextDays, firstNameOf, recentMoments, trName, type Badge } from "../utils/homeData";
import Avatar from "../components/Avatar";
import HelloSheet from "../components/HelloSheet";
import { SUN_AVATAR } from "../data/avatars";
import {
  ActivityCard,
  Analysis,
  ConnectionsList,
  DailyActivityCard,
  RecencyCard,
  UpcomingList,
  useProfileInsights,
} from "../components/ProfileInsights";
import { AvatarStack, BadgeRow, InfoSheet, LinkButton, MomentTimeline, PillButton, PlanSheet, SectionHeader, WeekStrip } from "../components/Dashboard";
import { colors, colorScheme } from "../theme/colors";

const TOP_SAFE = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 48;
/** Group colours for the distribution bar, from the app palette. */
const GROUP_COLORS = [colors.primary, colors.primaryBorder, colors.warning, colors.accent, colors.secondary, colors.warm, colors.textMuted];

/**
 * Profile: who you are and a quick glance (people, this week, last 30 days),
 * then your groups, upcoming catch-ups, insights, badges and history, and
 * Hesap ayarları at the bottom. Long explanations open on demand.
 */
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top + 8 : TOP_SAFE;

  const [loaded, setLoaded] = useState(false);
  const [threshold, setThreshold] = useState(14);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [userAvatarId, setUserAvatarId] = useState<string | undefined>(undefined);
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [helloTarget, setHelloTarget] = useState<ContactForm | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [historyAll, setHistoryAll] = useState(false);

  const reload = useCallback(() => loadContacts().then(setContacts), []);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSettings(), loadContacts()]).then(([s, list]) => {
        setThreshold(s.reachOutThresholdDays || 14);
        setWeeklyGoal(s.weeklyGoal || 3);
        setUserName(s.userName || "");
        setEmail(s.email || "");
        setUserAvatarId(s.userAvatarId);
        setContacts(list);
        setLoaded(true);
      });
      return subscribeContacts(setContacts);
    }, [])
  );

  const known = useMemo(() => hasAnyHistory(contacts), [contacts]);
  const insight = useProfileInsights(contacts, threshold, weeklyGoal);
  const extra = useMemo(() => {
    const now = new Date();
    const groups = insight.groups.map(([label, count]) => ({
      label,
      count,
      people: contacts.filter((c) => (c.relationship?.trim() || "Diğer") === label),
    }));
    return {
      week: weekStats(contacts, weeklyGoal, now),
      days: currentWeek(now),
      next: nextDays(now),
      daily: dailyPeople(contacts, now),
      groups,
      badges: badges(contacts, weeklyGoal, now),
      history: recentMoments(contacts, 20, now),
    };
  }, [contacts, weeklyGoal, insight.groups]);

  const openPerson = (c: ContactForm) => navigation.navigate("PersonDetail", { contact: c });
  const upcomingDays = new Set(insight.upcoming.map((u) => u.date));
  const upcoming = day ? insight.upcoming.filter((u) => u.date === day) : insight.upcoming;
  const gap = insight.facts.longestGap;
  const gradient = colorScheme() === "dark" ? [colors.primarySoft, colors.bg] as const : ["#DDF3F1", "#F4FBFA", colors.bg] as const;

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Profile header on a soft sky ── */}
        <LinearGradient colors={gradient} style={[styles.hero, { paddingTop: topPad }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <Avatar name={userName} avatarId={userAvatarId ?? SUN_AVATAR} size={76} />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">{userName || t("Profil")}</Text>
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
              {email ? <Text style={styles.headerEmail} numberOfLines={1}>{email}</Text> : null}
            </View>
          </View>

          {/* Quick glance: each number once. */}
          {loaded ? (
            <View style={styles.stats}>
              <Stat label={t("Kayıtlı kişi")} value={String(contacts.length)} a11y={t("{count} kişi kayıtlı", { count: contacts.length })} />
              <View style={styles.statDivider} />
              <Stat
                label={t("Bu hafta")}
                value={`${extra.week.people}/${extra.week.goal}`}
                a11y={t("Haftalık hedef: {done} / {goal} kişi", { done: extra.week.people, goal: extra.week.goal })}
              />
              <View style={styles.statDivider} />
              <Stat
                label={t("Son 30 gün")}
                value={t("{count} kişi", { count: insight.recency.recent })}
                a11y={t("{count} kişiyle son 30 günde görüştün", { count: insight.recency.recent })}
              />
            </View>
          ) : null}
        </LinearGradient>

        {loaded ? (
          <View style={styles.content}>
            {!known && contacts.length > 0 ? (
              <Text style={styles.hint}>{t("Görüşme kaydettikçe görüşme aktivitesi dolacak.")}</Text>
            ) : null}

            {/* ── Your groups ── */}
            <SectionHeader title={t("Bağlantıların")} />
            {extra.groups.length === 0 ? (
              <Text style={styles.line}>{t("Henüz kişi eklenmedi")}</Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.rowPad}>
                  {extra.groups.map((g) => (
                    <TouchableOpacity
                      key={g.label}
                      style={styles.groupCard}
                      onPress={() => navigation.navigate("People", { group: g.label })}
                      accessibilityRole="button"
                      accessibilityLabel={t("{circle}: {count} kişi", { circle: tv(g.label), count: g.count })}
                      accessibilityHint={t("Bu gruptaki kişileri gösterir")}
                    >
                      <AvatarStack people={g.people} size={34} />
                      <Text style={styles.groupText} numberOfLines={1}>{`${tv(g.label)} · ${g.count}`}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {extra.groups.length > 1 ? <Distribution groups={extra.groups} total={contacts.length} /> : null}
              </>
            )}

            {/* ── Upcoming catch-ups ── */}
            <SectionHeader
              title={t("Yaklaşan görüşmeler")}
              right={<PillButton icon="calendar-outline" label={t("Görüşme planla")} onPress={() => setPlanOpen(true)} />}
            />
            <WeekStrip days={extra.next} marked={upcomingDays} selected={day} onSelect={setDay} />
            <UpcomingList upcoming={upcoming} onOpenPerson={openPerson} emptyText={day ? t("Bu gün için plan yok.") : undefined} />

            {/* ── Longest gap, with a gentle nudge ── */}
            {gap ? (
              <View style={styles.nudge}>
                <Avatar name={gap.contact.fullName} avatarId={gap.contact.avatarId} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.nudgeText}>{t("{nameWith} son görüşmen", { nameWith: trName(firstNameOf(gap.contact.fullName), "with") })}</Text>
                  <Text style={styles.nudgeValue}>{t("{days} gün önce", { days: gap.days })}</Text>
                </View>
                <TouchableOpacity style={styles.nudgeBtn} onPress={() => setHelloTarget(gap.contact)} accessibilityRole="button">
                  <Text style={styles.nudgeBtnText}>{t("Mesaj yaz")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ── Insights ── */}
            <SectionHeader title={t("İçgörüler")} />
            <ActivityCard weeks={insight.weeks} weeklyGoal={weeklyGoal} onDetails={() => setActivityOpen(true)} />
            <DailyActivityCard days={extra.days} counts={extra.daily} />
            <ConnectionsList groups={insight.groups} total={contacts.length} />
            <RecencyCard r={insight.recency} />
            <Analysis facts={insight.facts} />

            {/* ── Badges ── */}
            <SectionHeader title={t("Rozetler")} right={<Text style={styles.meta}>{`${extra.badges.filter((b) => b.earned).length}/${extra.badges.length}`}</Text>} />
            <BadgeRow items={extra.badges} onOpen={setBadge} />

            {/* ── History ── */}
            <SectionHeader
              title={t("Görüşme geçmişi")}
              right={extra.history.length > 5 ? (
                <LinkButton label={historyAll ? t("Daha az göster") : t("Tümünü göster ({count})", { count: extra.history.length })} onPress={() => setHistoryAll(!historyAll)} />
              ) : undefined}
            />
            {extra.history.length === 0 ? (
              <Text style={styles.line}>{t("Henüz görüşme kaydı yok")}</Text>
            ) : (
              <MomentTimeline items={historyAll ? extra.history : extra.history.slice(0, 5)} onOpen={openPerson} variant="history" />
            )}
          </View>
        ) : null}

        {/* ── Account settings ── */}
        <View style={styles.contentTight}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => navigation.navigate("AccountSettings")}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t("Hesap ayarları")}
            accessibilityHint={t("Bildirimler, gizlilik, kullanım amaçları, dil, görünüm ve yedekler")}
          >
            <View style={styles.settingsIcon}>
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsTitle}>{t("Hesap ayarları")}</Text>
              <Text style={styles.settingsSub}>{t("Bildirimler, gizlilik, kullanım amaçları, dil, görünüm ve yedekler")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PlanSheet visible={planOpen} contacts={contacts} day={day} onClose={() => setPlanOpen(false)} onSaved={() => reload()} />
      <HelloSheet visible={!!helloTarget} contact={helloTarget} onClose={() => setHelloTarget(null)} />
      <InfoSheet visible={activityOpen} title={t("Aktivite ayrıntıları")} onClose={() => setActivityOpen(false)}>
        <Text style={styles.body}>
          {t("Haftalık hedef ve grafik aynı ölçümü kullanır: pazartesiden pazara, görüşme kaydı olan farklı kişilerin sayısı. Aynı kişiyle aynı hafta birden fazla görüşme bir kez sayılır.")}
        </Text>
        <Text style={styles.body}>{t("Bu hafta {count} görüşme kaydettin.", { count: extra.week.moments })}</Text>
        <Text style={styles.meta}>{t("Hedefi Hesap ayarları > Haftalık hedef bölümünden değiştirebilirsin.")}</Text>
      </InfoSheet>
      <InfoSheet visible={!!badge} title={badge ? t(badge.title) : ""} onClose={() => setBadge(null)}>
        {badge ? (
          <>
            <Text style={styles.body}>{t(badge.goal)}</Text>
            <View style={styles.badgeTrack}>
              <View style={[styles.badgeFill, { width: `${Math.round(badge.progress * 100)}%` }]} />
            </View>
            <Text style={styles.meta}>
              {badge.earned ? t("Kazanıldı · {status}", { status: badge.status }) : t("İlerleme · {status}", { status: badge.status })}
            </Text>
          </>
        ) : null}
      </InfoSheet>
    </View>
  );
}

function Stat({ label, value, a11y }: { label: string; value: string; a11y: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={a11y}>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/** Bağlantı dağılımı: one stacked bar with a legend that names each count. */
function Distribution({ groups, total }: { groups: { label: string; count: number }[]; total: number }) {
  return (
    <View style={styles.distCard}>
      <Text style={styles.distTitle}>{t("Bağlantı dağılımı")}</Text>
      <View style={styles.stack} accessible accessibilityRole="image" accessibilityLabel={groups.map((g) => `${tv(g.label)} ${g.count}`).join(", ")}>
        {groups.map((g, i) => (
          <View key={g.label} style={{ flex: g.count / total, backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }} />
        ))}
      </View>
      <View style={styles.legend}>
        {groups.map((g, i) => (
          <View key={g.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }]} />
            <Text style={styles.legendText}>{`${tv(g.label)} ${g.count}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const card = { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border } as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },

  hero: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroAvatar: { borderRadius: 44, padding: 4, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primaryBorder },
  headerInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerName: { flexShrink: 1, fontSize: 24, lineHeight: 30, fontWeight: "700", color: colors.text },
  headerEmail: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.textSub },
  editBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  stats: { ...card, flexDirection: "row", alignItems: "stretch", paddingVertical: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  statLabel: { fontSize: 12, lineHeight: 16, color: colors.textSub },
  statValue: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: colors.primary, fontVariant: ["tabular-nums"] },

  content: { paddingHorizontal: 20, gap: 10 },
  contentTight: { paddingHorizontal: 20 },
  hint: { fontSize: 13, lineHeight: 18, color: colors.textSub },
  line: { fontSize: 14, lineHeight: 20, color: colors.textSub },
  meta: { fontSize: 13, lineHeight: 18, color: colors.textSub },
  body: { fontSize: 14, lineHeight: 20, color: colors.text },

  bleed: { marginHorizontal: -20 },
  rowPad: { paddingHorizontal: 20, gap: 10 },
  groupCard: { ...card, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  groupText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.text, maxWidth: 160 },

  distCard: { ...card, padding: 14, gap: 10 },
  distTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.text },
  stack: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", gap: 2 },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, lineHeight: 18, color: colors.textSub },

  nudge: {
    marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 16, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder,
  },
  nudgeText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.text },
  nudgeValue: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: colors.primary },
  nudgeBtn: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  nudgeBtnText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.onFill },

  badgeTrack: { height: 8, borderRadius: 4, backgroundColor: colors.borderLight, overflow: "hidden" },
  badgeFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },

  settingsRow: { ...card, marginTop: 24, minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  settingsInfo: { flex: 1, minWidth: 0 },
  settingsTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  settingsSub: { fontSize: 13, lineHeight: 18, color: colors.textSub },
});
