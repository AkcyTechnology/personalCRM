import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { copyWithAutoClear } from "../utils/clipboard";
import { loadContacts, markContacted, snoozeContact, subscribeContacts, updateContact } from "../data/contacts";
import LogInteractionModal from "../components/LogInteractionModal";
import { loadSettings } from "../data/userSettings";
import messageSuggestions from "./messageSuggestions.json";
import type { ContactForm, InteractionType } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import {
  isDue,
  isSnoozed,
  effectiveIntervalDays,
  daysSinceIntervalStart,
} from "../utils/reminderInterval";
import { averageHealthScore, healthScore, healthScoreColor, healthScoreLabel } from "../utils/healthScore";
import { nextBirthday } from "../utils/dates";
import SnoozeModal from "../components/SnoozeModal";
import HealthInfoModal from "../components/HealthInfoModal";
import MessageComposer from "../components/MessageComposer";
import Avatar from "../components/Avatar";
import { showToast, showUndoToast } from "../components/Toast";
import { hapticSuccess } from "../utils/haptics";

type DashboardFilter = "all" | "reachOut" | "upcoming" | "recent";

type DailySuggestion = {
  id: number;
  title: string;
  message: string;
  category?: string;
  tone?: string;
};

type IconName = keyof typeof Ionicons.glyphMap;

function daysSince(iso?: string): number {
  if (!iso) return 9999;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 9999;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

/** Compact "3g" / "Bugün" style label. */
function shortDays(days: number) {
  if (days <= 0) return "Bugün";
  if (days >= 9999) return "—";
  return `${days}g`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

function getDailySuggestion(): DailySuggestion {
  const list = messageSuggestions as DailySuggestion[];
  if (!Array.isArray(list) || list.length === 0) {
    return {
      id: 0,
      title: "Bugünün mesaj fikri",
      message: "Uzun zamandır konuşmadığın birine kısa ve samimi bir selam gönder.",
    };
  }
  return list[(getDayOfYear() - 1) % list.length];
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [threshold, setThreshold] = useState(14);
  const [userName, setUserName] = useState("");
  const [snoozeTarget, setSnoozeTarget] = useState<ContactForm | null>(null);
  const [composerTarget, setComposerTarget] = useState<ContactForm | null>(null);
  const [logTarget, setLogTarget] = useState<ContactForm | null>(null);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
        setUserName(s.userName || "");
        setLoaded(true);
      });
      // Bildirimden "Görüştüm" gibi arka planda yapılan değişiklikler
      return subscribeContacts(setContacts);
    }, [])
  );

  const goToContact = (contact: ContactForm) => navigation.navigate("PersonDetail", { contact });
  const goToPeople = (filter: DashboardFilter = "all") => navigation.navigate("People", { filter, threshold });
  const goToReminders = (filter: DashboardFilter = "all") => navigation.navigate("Reminders", { filter, threshold });

  const dailySuggestion = useMemo(() => getDailySuggestion(), []);

  const dashboard = useMemo(() => {
    const active = contacts.filter((c) => !isSnoozed(c) && c.reminderEnabled !== false);
    const byOldest = [...active].sort((a, b) => daysSinceIntervalStart(b) - daysSinceIntervalStart(a));

    const today = byOldest.filter((c) => isDue(c, threshold));

    const upcoming = byOldest
      .filter((c) => {
        const d = daysSinceIntervalStart(c);
        const interval = effectiveIntervalDays(c, threshold);
        return d >= Math.floor(interval * 0.6) && d < interval;
      })
      .slice(0, 3);

    const now = new Date();
    const birthdays = contacts
      .map((c) => ({ contact: c, date: nextBirthday(c.birthday, now) }))
      .filter((b): b is { contact: ContactForm; date: Date } => !!b.date)
      .map((b) => ({
        ...b,
        daysLeft: Math.round(
          (b.date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000
        ),
      }))
      .filter((b) => b.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8);

    const recent = [...contacts]
      .filter((c) => daysSince(c.lastContactDate) < 9999)
      .sort((a, b) => daysSince(a.lastContactDate) - daysSince(b.lastContactDate))
      .slice(0, 3);

    return {
      today,
      upcoming,
      birthdays,
      recent,
      contactedThisWeek: contacts.filter((c) => daysSince(c.lastContactDate) <= 7).length,
      health: averageHealthScore(contacts, threshold),
    };
  }, [contacts, threshold]);

  const handleSnoozeConfirm = useCallback(
    async (date: string) => {
      const target = snoozeTarget;
      setSnoozeTarget(null);
      if (!target?.id) return;
      try {
        const previous = target.snoozedUntil;
        await snoozeContact(target.id, date);
        setContacts(await loadContacts());
        showUndoToast(`${firstName(target.fullName)} ertelendi`, async () => {
          await updateContact(target.id!, { snoozedUntil: previous });
          setContacts(await loadContacts());
        });
      } catch {
        showToast("Ertelenemedi. Lütfen tekrar dene.");
      }
    },
    [snoozeTarget]
  );

  const handleLogInteraction = useCallback(
    async (type: InteractionType, note: string, date: string) => {
      const target = logTarget;
      setLogTarget(null);
      if (!target?.id) return;
      const snapshot = {
        interactions: target.interactions,
        lastContactDate: target.lastContactDate,
        reminderIntervalStart: target.reminderIntervalStart,
        snoozedUntil: target.snoozedUntil,
      };
      try {
        await markContacted(target.id, type, note, date);
        hapticSuccess();
        setContacts(await loadContacts());
        showUndoToast(`${firstName(target.fullName)} ile görüşme kaydedildi`, async () => {
          await updateContact(target.id!, snapshot);
          setContacts(await loadContacts());
        });
      } catch {
        showToast("Kaydedilemedi. Lütfen tekrar dene.");
      }
    },
    [logTarget]
  );

  const dueCount = dashboard.today.length;
  const subtitle = !loaded
    ? " "
    : contacts.length === 0
      ? "Hadi ilk kişini ekleyelim"
      : dueCount > 0
        ? `Bugün ${dueCount} kişi seni bekliyor`
        : "Bugün her şey yolunda ✓";

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting} numberOfLines={1} accessibilityRole="header">
            {userName ? `Merhaba, ${firstName(userName)}` : "Merhaba 👋"}
          </Text>
          <Text style={[styles.greetingSub, dueCount > 0 && styles.greetingSubAccent]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <IconButton
          icon="id-card-outline"
          label="Dijital kartvizit"
          onPress={() => navigation.navigate("BusinessCard")}
        />
        <IconButton
          icon="notifications-outline"
          label={dueCount > 0 ? `Hatırlatıcılar, ${dueCount} bekleyen` : "Hatırlatıcılar"}
          badge={dueCount}
          onPress={() => goToReminders("all")}
        />
      </View>

      {!loaded ? (
        <HomeSkeleton />
      ) : contacts.length === 0 ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people" size={30} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>İlk kişini ekle</Text>
            <Text style={styles.emptyDesc}>Kimi unutmak istemiyorsun?</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("AddContact")}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Kişi ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("ImportContacts")}
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Rehberden aktar</Text>
            </TouchableOpacity>
          </View>
          <DailyMessageCard suggestion={dailySuggestion} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Health ── */}
          <View style={styles.healthCard}>
            <View style={styles.healthTop}>
              <View>
                <View style={styles.rowCenter}>
                  <Text style={styles.kicker}>İlişki sağlığı</Text>
                  <TouchableOpacity
                    onPress={() => setHealthInfoOpen(true)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="İlişki sağlığı nasıl hesaplanır?"
                  >
                    <Ionicons name="information-circle-outline" size={18} color={colors.textSub} />
                  </TouchableOpacity>
                </View>
                <View style={styles.rowBaseline}>
                  <Text style={[styles.healthNumber, { color: healthScoreColor(dashboard.health) }]}>
                    {dashboard.health}
                  </Text>
                  <Text style={styles.healthTotal}>/100</Text>
                  <View style={[styles.healthPill, { backgroundColor: healthScoreColor(dashboard.health) + "1A" }]}>
                    <Text style={[styles.healthPillText, { color: healthScoreColor(dashboard.health) }]}>
                      {healthScoreLabel(dashboard.health)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.bar} accessibilityLabel={`İlişki sağlığı ${dashboard.health} / 100`}>
              <View
                style={[
                  styles.barFill,
                  { width: `${dashboard.health}%`, backgroundColor: healthScoreColor(dashboard.health) },
                ]}
              />
            </View>
            <View style={styles.statsRow}>
              <Stat icon="people-outline" value={contacts.length} label="Kişi" onPress={() => goToPeople("all")} />
              <Stat icon="chatbubbles-outline" value={dashboard.contactedThisWeek} label="Bu hafta" onPress={() => goToPeople("recent")} />
              <Stat
                icon="alarm-outline"
                value={dueCount}
                label="Bekleyen"
                danger={dueCount > 0}
                onPress={() => goToPeople("reachOut")}
              />
            </View>
          </View>

          {/* ── Today ── */}
          <SectionHeader title="Bugün" count={dueCount} onPress={dueCount > 0 ? () => goToPeople("reachOut") : undefined} />
          {dueCount > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
              style={styles.carouselWrap}
            >
              {dashboard.today.map((c) => (
                <TodayCard
                  key={c.id}
                  contact={c}
                  days={daysSinceIntervalStart(c)}
                  ring={healthScoreColor(healthScore(c, threshold))}
                  onOpen={() => goToContact(c)}
                  onDone={() => setLogTarget(c)}
                  onMessage={() => setComposerTarget(c)}
                  onSnooze={() => setSnoozeTarget(c)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.allGood}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.allGoodText}>Bekleyen kimse yok</Text>
            </View>
          )}

          {/* ── Birthdays ── */}
          {dashboard.birthdays.length > 0 ? (
            <>
              <SectionHeader title="Doğum günleri" icon="gift-outline" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
                style={styles.carouselWrap}
              >
                {dashboard.birthdays.map(({ contact, daysLeft }) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.bdayChip}
                    onPress={() => goToContact(contact)}
                    accessibilityRole="button"
                    accessibilityLabel={`${contact.fullName}, doğum günü ${daysLeft === 0 ? "bugün" : `${daysLeft} gün sonra`}`}
                  >
                    <Avatar name={contact.fullName} size={36} />
                    <View>
                      <Text style={styles.bdayName} numberOfLines={1}>{firstName(contact.fullName)}</Text>
                      <Text style={[styles.bdayDays, daysLeft <= 1 && { color: colors.secondary }]}>
                        {daysLeft === 0 ? "Bugün 🎉" : daysLeft === 1 ? "Yarın" : `${daysLeft}g`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* ── Upcoming ── */}
          {dashboard.upcoming.length > 0 ? (
            <>
              <SectionHeader title="Yaklaşanlar" onPress={() => goToReminders("upcoming")} />
              <View style={styles.list}>
                {dashboard.upcoming.map((c) => {
                  const left = Math.max(0, effectiveIntervalDays(c, threshold) - daysSinceIntervalStart(c));
                  return (
                    <ContactRow
                      key={c.id}
                      contact={c}
                      chip={`${left}g`}
                      chipIcon="hourglass-outline"
                      chipColor={colors.warning}
                      a11y={`${c.fullName}, ${left} gün kaldı`}
                      onPress={() => goToContact(c)}
                    />
                  );
                })}
              </View>
            </>
          ) : null}

          {/* ── Recent ── */}
          {dashboard.recent.length > 0 ? (
            <>
              <SectionHeader title="Son görüşülenler" onPress={() => goToPeople("recent")} />
              <View style={styles.list}>
                {dashboard.recent.map((c) => {
                  const d = daysSince(c.lastContactDate);
                  return (
                    <ContactRow
                      key={c.id}
                      contact={c}
                      chip={shortDays(d)}
                      chipIcon="checkmark-done-outline"
                      chipColor={colors.success}
                      a11y={`${c.fullName}, son görüşme ${d === 0 ? "bugün" : `${d} gün önce`}`}
                      onPress={() => goToContact(c)}
                    />
                  );
                })}
              </View>
            </>
          ) : null}

          {contacts.length < 3 ? (
            <TouchableOpacity
              style={styles.importRow}
              onPress={() => navigation.navigate("ImportContacts")}
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={20} color={colors.primary} />
              <Text style={styles.importText}>Rehberden kişi aktar</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          <DailyMessageCard suggestion={dailySuggestion} />
        </ScrollView>
      )}

      <SnoozeModal
        visible={!!snoozeTarget}
        contactName={snoozeTarget?.fullName ?? ""}
        onCancel={() => setSnoozeTarget(null)}
        onConfirm={handleSnoozeConfirm}
      />

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />

      <LogInteractionModal
        visible={!!logTarget}
        contactName={logTarget?.fullName ?? ""}
        onClose={() => setLogTarget(null)}
        onSave={handleLogInteraction}
      />

      <MessageComposer
        visible={!!composerTarget}
        contact={composerTarget}
        onClose={() => setComposerTarget(null)}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconButton({
  icon, label, badge, onPress,
}: { icon: IconName; label: string; badge?: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} allowFontScaling={false}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function Stat({
  icon, value, label, danger, onPress,
}: { icon: IconName; value: number; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.stat}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.textSub} />
      <Text style={[styles.statValue, danger && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({
  title, count, icon, onPress,
}: { title: string; count?: number; icon?: IconName; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.rowCenter}>
        {icon ? <Ionicons name={icon} size={18} color={colors.text} /> : null}
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
        {count ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{count}</Text>
          </View>
        ) : null}
      </View>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`${title}: tümünü gör`}
        >
          <Text style={styles.seeAll}>Tümü</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function TodayCard({
  contact, days, ring, onOpen, onDone, onMessage, onSnooze,
}: {
  contact: ContactForm;
  days: number;
  ring: string;
  onOpen: () => void;
  onDone: () => void;
  onMessage: () => void;
  onSnooze: () => void;
}) {
  return (
    <View style={styles.todayCard}>
      <TouchableOpacity
        style={styles.todayTop}
        onPress={onOpen}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${contact.fullName}, ${days >= 9999 ? "henüz görüşme yok" : `${days} gündür görüşülmedi`}`}
      >
        <Avatar name={contact.fullName} size={56} ringColor={ring} />
        <Text style={styles.todayName} numberOfLines={1}>{firstName(contact.fullName)}</Text>
        <View style={styles.rowCenter}>
          <Ionicons name="time-outline" size={13} color={colors.danger} />
          <Text style={styles.todayDays}>{shortDays(days)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.doneBtn}
        onPress={onDone}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${contact.fullName} ile görüştüm`}
      >
        <Ionicons name="checkmark" size={16} color={colors.white} />
        <Text style={styles.doneText}>Görüştüm</Text>
      </TouchableOpacity>
      <View style={styles.todayActions}>
        <TouchableOpacity
          style={styles.smallIconBtn}
          onPress={onMessage}
          accessibilityRole="button"
          accessibilityLabel={`${contact.fullName} için mesaj hazırla`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallIconBtn}
          onPress={onSnooze}
          accessibilityRole="button"
          accessibilityLabel={`${contact.fullName} hatırlatmasını ertele`}
        >
          <Ionicons name="alarm-outline" size={18} color={colors.textSub} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ContactRow({
  contact, chip, chipIcon, chipColor, a11y, onPress,
}: {
  contact: ContactForm;
  chip: string;
  chipIcon: IconName;
  chipColor: string;
  a11y: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.contactRow}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Avatar name={contact.fullName} size={40} />
      <Text style={styles.contactName} numberOfLines={1}>{contact.fullName}</Text>
      <View style={[styles.chip, { backgroundColor: chipColor + "1A" }]}>
        <Ionicons name={chipIcon} size={13} color={chipColor} />
        <Text style={[styles.chipText, { color: chipColor }]}>{chip}</Text>
      </View>
    </TouchableOpacity>
  );
}

function DailyMessageCard({ suggestion }: { suggestion: DailySuggestion }) {
  const copyMessage = async () => {
    await copyWithAutoClear(suggestion.message);
    showToast("Kopyalandı · 90 sn sonra panodan silinir");
  };

  return (
    <TouchableOpacity
      style={styles.dailyCard}
      activeOpacity={0.86}
      onPress={copyMessage}
      accessibilityRole="button"
      accessibilityLabel={`Günün mesajı: ${suggestion.message}`}
      accessibilityHint="Mesajı kopyalar"
    >
      <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
      <Text style={styles.dailyMessage} numberOfLines={2}>“{suggestion.message}”</Text>
      <Ionicons name="copy-outline" size={18} color={colors.textSub} />
    </TouchableOpacity>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.content} accessibilityLabel="Yükleniyor" accessibilityRole="progressbar">
      <View style={[styles.skeleton, { height: 150 }]} />
      <View style={[styles.skeleton, { height: 22, width: 120, marginTop: 24 }]} />
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View style={[styles.skeleton, { height: 170, width: 140 }]} />
        <View style={[styles.skeleton, { height: 170, width: 140 }]} />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBaseline: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
  greetingSub: { fontSize: 15, color: colors.textSub, marginTop: 2 },
  greetingSubAccent: { color: colors.primary, fontWeight: "700" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "800" },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },

  healthCard: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  healthTop: { flexDirection: "row", justifyContent: "space-between" },
  kicker: { fontSize: 14, fontWeight: "700", color: colors.textSub },
  healthNumber: { fontSize: 40, fontWeight: "800", letterSpacing: -1 },
  healthTotal: { fontSize: 16, color: colors.textSub, fontWeight: "600" },
  healthPill: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  healthPillText: { fontSize: 13, fontWeight: "800" },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: {
    flex: 1,
    minHeight: 64,
    backgroundColor: colors.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 13, color: colors.textSub, fontWeight: "600" },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  countPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: { fontSize: 13, fontWeight: "800", color: colors.danger },
  seeAll: { fontSize: 15, fontWeight: "700", color: colors.primary },

  carouselWrap: { marginHorizontal: -20 },
  carousel: { paddingHorizontal: 20, gap: 12 },
  todayCard: {
    width: 148,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: "center",
  },
  todayTop: { alignItems: "center", gap: 6, width: "100%" },
  todayName: { fontSize: 16, fontWeight: "800", color: colors.text, maxWidth: "100%" },
  todayDays: { fontSize: 13, fontWeight: "700", color: colors.danger },
  doneBtn: {
    marginTop: 10,
    alignSelf: "stretch",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  doneText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  todayActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  smallIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  allGood: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.successSoft,
  },
  allGoodText: { fontSize: 15, fontWeight: "700", color: colors.success },

  bdayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.secondarySoft,
    minHeight: 52,
  },
  bdayName: { fontSize: 15, fontWeight: "700", color: colors.text, maxWidth: 110 },
  bdayDays: { fontSize: 13, fontWeight: "600", color: colors.textSub },

  list: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contactName: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 13, fontWeight: "800" },

  importRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    minHeight: 52,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  importText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.primary },

  dailyCard: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.accentSoft,
  },
  dailyMessage: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },

  emptyCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 4 },
  emptyDesc: { fontSize: 15, color: colors.textSub },
  primaryButton: {
    marginTop: 8,
    alignSelf: "stretch",
    minHeight: 50,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  secondaryButton: {
    alignSelf: "stretch",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: "700" },

  skeleton: { backgroundColor: colors.borderLight, borderRadius: radius.card },
});
