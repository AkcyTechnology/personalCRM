import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { copyWithAutoClear } from "../utils/clipboard";
import { loadContacts, snoozeContact, subscribeContacts, updateContact } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import { dailyMessage } from "../data/messages";
import type { ContactForm } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { isDue, daysSinceIntervalStart } from "../utils/reminderInterval";
import { averageHealthScore, healthScore, healthScoreColor, healthScoreLabel } from "../utils/healthScore";
import { nextBirthday } from "../utils/dates";
import {
  onThisDay,
  peopleThisWeek,
  personOfTheDay,
  reasonFor,
  todaysSparks,
  treeState,
  weeklyStreak,
  TREE_STAGES,
  type Spark,
  type TreeState,
} from "../utils/engagement";
import { logMoment } from "../app/momentActions";
import SnoozeModal from "../components/SnoozeModal";
import HealthInfoModal from "../components/HealthInfoModal";
import MessageComposer from "../components/MessageComposer";
import LogInteractionModal from "../components/LogInteractionModal";
import ProgressRing from "../components/ProgressRing";
import BondTree from "../components/BondTree";
import Appear from "../components/Appear";
import AnalyticsConsent from "../components/AnalyticsConsent";
import CountUp from "../components/CountUp";
import Avatar from "../components/Avatar";
import { showToast, showUndoToast } from "../components/Toast";
import { reasonText } from "./ShuffleScreen";
import { track } from "../utils/analytics";
import { t } from "../i18n";

type IconName = keyof typeof Ionicons.glyphMap;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function shortDays(days: number) {
  if (days <= 0) return t("Bugün");
  if (days >= 9999) return "—";
  return t("{days}g", { days });
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [threshold, setThreshold] = useState(14);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [userName, setUserName] = useState("");
  const [snoozeTarget, setSnoozeTarget] = useState<ContactForm | null>(null);
  const [composerTarget, setComposerTarget] = useState<ContactForm | null>(null);
  const [logTarget, setLogTarget] = useState<ContactForm | null>(null);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);
  const [treeInfoOpen, setTreeInfoOpen] = useState(false);

  const reload = useCallback(() => loadContacts().then(setContacts), []);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
        setWeeklyGoal(s.weeklyGoal || 3);
        setUserName(s.userName || "");
        setLoaded(true);
      });
      return subscribeContacts(setContacts);
    }, [])
  );

  const goToContact = (contact: ContactForm) => navigation.navigate("PersonDetail", { contact });

  const data = useMemo(() => {
    const now = new Date();
    const due = contacts
      .filter((c) => isDue(c, threshold))
      .sort((a, b) => daysSinceIntervalStart(b) - daysSinceIntervalStart(a));
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const birthdays = contacts
      .map((c) => ({ contact: c, date: nextBirthday(c.birthday, now) }))
      .filter((b): b is { contact: ContactForm; date: Date } => !!b.date)
      .map((b) => ({ ...b, daysLeft: Math.round((b.date.getTime() - startOfToday) / 86_400_000) }))
      .filter((b) => b.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8);
    const pod = personOfTheDay(contacts, threshold, now);
    return {
      due,
      birthdays,
      pod,
      sparks: todaysSparks(contacts, threshold, now),
      memories: onThisDay(contacts, now),
      streak: weeklyStreak(contacts, now),
      thisWeek: peopleThisWeek(contacts, now),
      tree: treeState(contacts, now),
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
        await reload();
        showUndoToast(t("{name} ertelendi", { name: firstName(target.fullName) }), async () => {
          await updateContact(target.id!, { snoozedUntil: previous });
          await reload();
        });
      } catch {
        showToast(t("Ertelenemedi. Lütfen tekrar dene."));
      }
    },
    [snoozeTarget, reload]
  );

  const dueCount = data.due.length;
  const subtitle = !loaded
    ? " "
    : contacts.length === 0
      ? t("Hadi ilk kişini ekleyelim")
      : dueCount === 1
        ? t("Görüşmek isteyebileceğin biri var")
        : dueCount > 1
          ? t("Görüşmek isteyebileceğin birkaç kişi var")
          : t("Bugün her şey yolunda ✓");

  const sparksDone = data.sparks.filter((s) => s.done).length;

  const onSpark = (s: Spark) => {
    track("spark_opened", { kind: s.kind });
    if (s.kind === "meetUp") navigation.navigate("Shuffle");
    else if (s.kind === "birthday" || s.kind === "reconnect") setComposerTarget(s.contact);
    else goToContact(s.contact);
  };

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting} numberOfLines={1} accessibilityRole="header">
            {userName ? t("Merhaba, {name}", { name: firstName(userName) }) : t("Merhaba 👋")}
          </Text>
          <Text style={[styles.greetingSub, dueCount > 0 && styles.greetingSubAccent]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <IconButton icon="id-card-outline" label={t("Dijital kartvizit")} onPress={() => navigation.navigate("BusinessCard")} />
        <IconButton
          icon="notifications-outline"
          label={dueCount > 0 ? t("Hatırlatıcılar, {count} kişi", { count: dueCount }) : t("Hatırlatıcılar")}
          badge={dueCount}
          onPress={() => navigation.navigate("Reminders", { filter: "all", threshold })}
        />
      </View>

      {!loaded ? (
        <HomeSkeleton />
      ) : contacts.length === 0 ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[colors.primarySoft, colors.accentSoft]} style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart" size={30} color={colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>{t("İlk kişini ekle")}</Text>
            <Text style={styles.emptyDesc}>{t("Kimi unutmak istemiyorsun?")}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("AddContact")} accessibilityRole="button">
              <Ionicons name="add" size={20} color={colors.onFill} />
              <Text style={styles.primaryButtonText}>{t("Kişi ekle")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("ImportContacts")} accessibilityRole="button">
              <Ionicons name="download-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>{t("Rehberden aktar")}</Text>
            </TouchableOpacity>
          </LinearGradient>
          <Text style={styles.tagline}>{t("Life happens between people.")}</Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Bond tree ── */}
          <Appear index={0}>
            <TreeCard tree={data.tree} onPress={() => setTreeInfoOpen(true)} />
          </Appear>

          {/* ── This week: goal ring · streak · connection ── */}
          <Appear index={1}>
          <View style={styles.weekCard}>
            <ProgressRing
              size={104}
              stroke={11}
              progress={data.thisWeek / weeklyGoal}
              color={colors.primary}
              accessibilityLabel={t("Bu hafta {done} / {goal} kişi", { done: data.thisWeek, goal: weeklyGoal })}
            >
              <CountUp value={data.thisWeek} style={styles.ringValue} format={(n) => `${n}/${weeklyGoal}`} />
              <Text style={styles.ringLabel}>{t("bu hafta")}</Text>
            </ProgressRing>

            <View style={styles.weekRight}>
              <View style={styles.streakRow} accessible accessibilityLabel={t("{count} haftalık seri", { count: data.streak.current })}>
                <Text style={styles.flame}>{data.streak.current > 0 ? "🔥" : "🌱"}</Text>
                <View style={styles.streakTextCol}>
                  <Text style={styles.streakValue}>
                    {data.streak.current > 0 ? t("{count} hafta", { count: data.streak.current }) : t("Seriyi başlat")}
                  </Text>
                  <Text style={styles.streakSub}>
                    {data.streak.thisWeekDone ? t("Bu haftayı kurtardın") : data.streak.current > 0 ? t("Seriyi sürdürmek için bir an kaydet") : t("Haftada bir an yeter")}
                  </Text>
                </View>
              </View>
              <View style={styles.weekMetaRow}>
                {data.streak.freezes > 0 ? (
                  <View style={styles.metaPill} accessible accessibilityLabel={t("{count} dondurma hakkı", { count: data.streak.freezes })}>
                    <Text style={styles.metaPillText}>{"❄️".repeat(data.streak.freezes)}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[styles.metaPill, { backgroundColor: healthScoreColor(data.health) + "1A" }]}
                  onPress={() => setHealthInfoOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t("Bağlantı durumu: {label}. Nasıl hesaplanır?", { label: t(healthScoreLabel(data.health)) })}
                >
                  <View style={[styles.healthDot, { backgroundColor: healthScoreColor(data.health) }]} />
                  <Text style={[styles.metaPillText, { color: healthScoreColor(data.health) }]}>{t(healthScoreLabel(data.health))}</Text>
                  <Ionicons name="information-circle-outline" size={15} color={healthScoreColor(data.health)} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </Appear>

          {/* ── Person of the day ── */}
          {data.pod ? (
            <Appear index={2}>
            <LinearGradient colors={[colors.primarySoft, colors.accentSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.podCard}>
              <Text style={styles.podKicker}>{t("Günün kişisi")}</Text>
              <TouchableOpacity
                style={styles.podTop}
                onPress={() => goToContact(data.pod!)}
                accessibilityRole="button"
                accessibilityLabel={`${data.pod.fullName}. ${reasonText(reasonFor(data.pod), firstName(data.pod.fullName))}`}
              >
                <Avatar name={data.pod.fullName} size={68} ringColor={healthScoreColor(healthScore(data.pod, threshold))} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.podName} numberOfLines={1}>{data.pod.fullName}</Text>
                  <Text style={styles.podReason} numberOfLines={2}>{reasonText(reasonFor(data.pod), firstName(data.pod.fullName))}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.podActions}>
                <TouchableOpacity style={styles.podPrimary} onPress={() => setComposerTarget(data.pod)} accessibilityRole="button">
                  <Ionicons name="chatbubble-ellipses" size={18} color={colors.onFill} />
                  <Text style={styles.podPrimaryText}>{t("Merhaba de")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.podIcon}
                  onPress={() => setLogTarget(data.pod)}
                  accessibilityRole="button"
                  accessibilityLabel={t("{name} ile görüştüm", { name: data.pod.fullName })}
                >
                  <Ionicons name="checkmark" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.podIcon}
                  onPress={() => navigation.navigate("Shuffle")}
                  accessibilityRole="button"
                  accessibilityLabel={t("Başka birini göster")}
                >
                  <Ionicons name="shuffle" size={22} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            </Appear>
          ) : null}

          {/* ── Today's sparks ── */}
          {data.sparks.length > 0 ? (
            <Appear index={3}>
              <View style={styles.sectionHeader}>
                <View style={styles.rowCenter}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">{t("Bugünün kıvılcımları")}</Text>
                </View>
                <ProgressRing
                  size={36}
                  stroke={5}
                  progress={sparksDone / data.sparks.length}
                  color={colors.accent}
                  accessibilityLabel={t("{done} / {total} tamamlandı", { done: sparksDone, total: data.sparks.length })}
                >
                  <Text style={styles.miniRingText}>{sparksDone}</Text>
                </ProgressRing>
              </View>
              <View style={styles.list}>
                {data.sparks.map((s) => (
                  <SparkRow key={s.id} spark={s} onPress={() => onSpark(s)} />
                ))}
              </View>
            </Appear>
          ) : null}

          {/* ── People to reconnect with ── */}
          {dueCount > 0 ? (
            <Appear index={4}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">{t("Yeniden bağlan")}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("People", { filter: "reachOut", threshold })}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("Yeniden bağlan: tümünü gör")}
                >
                  <Text style={styles.seeAll}>{t("Tümü")}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={styles.carouselWrap}>
                {data.due.slice(0, 10).map((c) => (
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
            </Appear>
          ) : null}

          {/* ── On this day ── */}
          {data.memories.map((m, i) => (
            <TouchableOpacity
              key={`${m.contact.id}-${i}`}
              style={styles.memoryCard}
              onPress={() => goToContact(m.contact)}
              accessibilityRole="button"
            >
              <Text style={styles.memoryEmoji}>{m.kind === "added" ? "🤝" : "📸"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.memoryKicker}>{t("Bugün {count} yıl önce", { count: m.yearsAgo })}</Text>
                <Text style={styles.memoryText} numberOfLines={2}>
                  {m.kind === "added"
                    ? t("{name} hayatına girdi", { name: m.contact.fullName })
                    : m.interaction?.note
                      ? `${m.contact.fullName}: “${m.interaction.note}”`
                      : t("{name} ile görüşmüştün", { name: m.contact.fullName })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}

          {/* ── Birthdays ── */}
          {data.birthdays.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.rowCenter}>
                  <Ionicons name="gift-outline" size={18} color={colors.text} />
                  <Text style={styles.sectionTitle} accessibilityRole="header">{t("Doğum günleri")}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={styles.carouselWrap}>
                {data.birthdays.map(({ contact, daysLeft }) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.bdayChip}
                    onPress={() => setComposerTarget(contact)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      daysLeft === 0
                        ? t("{name}, doğum günü bugün", { name: contact.fullName })
                        : t("{name}, doğum günü {days} gün sonra", { name: contact.fullName, days: daysLeft })
                    }
                  >
                    <Avatar name={contact.fullName} size={36} />
                    <View>
                      <Text style={styles.bdayName} numberOfLines={1}>{firstName(contact.fullName)}</Text>
                      <Text style={[styles.bdayDays, daysLeft <= 1 && { color: colors.secondary }]}>
                        {daysLeft === 0 ? t("Bugün 🎉") : daysLeft === 1 ? t("Yarın") : t("{days}g", { days: daysLeft })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          {contacts.length < 3 ? (
            <TouchableOpacity style={styles.importRow} onPress={() => navigation.navigate("ImportContacts")} accessibilityRole="button">
              <Ionicons name="download-outline" size={20} color={colors.primary} />
              <Text style={styles.importText}>{t("Rehberden kişi aktar")}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          <DailyMessageCard />
          <Text style={styles.tagline}>{t("Life happens between people.")}</Text>
        </ScrollView>
      )}

      <SnoozeModal
        visible={!!snoozeTarget}
        contactName={snoozeTarget?.fullName ?? ""}
        onCancel={() => setSnoozeTarget(null)}
        onConfirm={handleSnoozeConfirm}
      />
      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />
      <TreeInfoModal visible={treeInfoOpen} tree={data.tree} onClose={() => setTreeInfoOpen(false)} />
      <AnalyticsConsent ready={loaded && contacts.length > 0} />
      <LogInteractionModal
        visible={!!logTarget}
        contactName={logTarget?.fullName ?? ""}
        onClose={() => setLogTarget(null)}
        onSave={(type, note, date) => {
          const target = logTarget;
          setLogTarget(null);
          if (target) logMoment(target, type, note, date, () => reload());
        }}
      />
      <MessageComposer visible={!!composerTarget} contact={composerTarget} onClose={() => setComposerTarget(null)} />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconButton({ icon, label, badge, onPress }: { icon: IconName; label: string; badge?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={colors.text} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} allowFontScaling={false}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function sparkContent(s: Spark): { icon: IconName; color: string; text: string } {
  switch (s.kind) {
    case "reconnect":
      return {
        icon: "paper-plane-outline",
        color: colors.primary,
        text: s.days > 0
          ? t("{days} gündür konuşmadığın {name}'e yaz", { days: s.days, name: firstName(s.contact.fullName) })
          : t("{name}'e bir merhaba gönder", { name: firstName(s.contact.fullName) }),
      };
    case "birthday":
      return {
        icon: "gift-outline",
        color: colors.secondary,
        text: s.days === 0
          ? t("{name}'in doğum gününü kutla 🎂", { name: firstName(s.contact.fullName) })
          : t("{name}'in doğum günü {days} gün sonra — bir sürpriz düşün", { name: firstName(s.contact.fullName), days: s.days }),
      };
    case "followUp":
      return {
        icon: "chatbubbles-outline",
        color: colors.accent,
        text: t("{name}'e şunu sor: “{note}”", { name: firstName(s.contact.fullName), note: s.note.length > 40 ? `${s.note.slice(0, 40)}…` : s.note }),
      };
    default:
      return { icon: "cafe-outline", color: colors.warning, text: t("Bir arkadaşınla kahve planla") };
  }
}

function SparkRow({ spark, onPress }: { spark: Spark; onPress: () => void }) {
  const c = sparkContent(spark);
  return (
    <TouchableOpacity
      style={styles.sparkRow}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={c.text}
      accessibilityState={{ checked: spark.done }}
    >
      <View style={[styles.sparkCheck, spark.done && { backgroundColor: colors.success, borderColor: colors.success }]}>
        {spark.done ? <Ionicons name="checkmark" size={16} color={colors.onFill} /> : <Ionicons name={c.icon} size={16} color={c.color} />}
      </View>
      <Text style={[styles.sparkText, spark.done && styles.sparkTextDone]} numberOfLines={2}>{c.text}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
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
        accessibilityLabel={days >= 9999 ? contact.fullName : t("{name}, {days} gündür görüşülmedi", { name: contact.fullName, days })}
      >
        <Avatar name={contact.fullName} size={56} ringColor={ring} />
        <Text style={styles.todayName} numberOfLines={1}>{firstName(contact.fullName)}</Text>
        <View style={styles.rowCenter}>
          <Ionicons name="time-outline" size={13} color={colors.textSub} />
          <Text style={styles.todayDays}>{shortDays(days)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.doneBtn}
        onPress={onDone}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("{name} ile görüştüm", { name: contact.fullName })}
      >
        <Ionicons name="checkmark" size={16} color={colors.onFill} />
        <Text style={styles.doneText}>{t("Görüştüm")}</Text>
      </TouchableOpacity>
      <View style={styles.todayActions}>
        <TouchableOpacity
          style={styles.smallIconBtn}
          onPress={onMessage}
          accessibilityRole="button"
          accessibilityLabel={t("{name} için mesaj hazırla", { name: contact.fullName })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallIconBtn}
          onPress={onSnooze}
          accessibilityRole="button"
          accessibilityLabel={t("{name} hatırlatmasını ertele", { name: contact.fullName })}
        >
          <Ionicons name="alarm-outline" size={18} color={colors.textSub} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DailyMessageCard() {
  const message = useMemo(() => dailyMessage(), []);
  const copyMessage = async () => {
    await copyWithAutoClear(message);
    showToast(t("Kopyalandı · 90 sn sonra panodan silinir"));
  };
  return (
    <TouchableOpacity
      style={styles.dailyCard}
      activeOpacity={0.86}
      onPress={copyMessage}
      accessibilityRole="button"
      accessibilityLabel={t("Günün mesajı: {message}", { message })}
      accessibilityHint={t("Mesajı kopyalar")}
    >
      <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
      <Text style={styles.dailyMessage} numberOfLines={2}>“{message}”</Text>
      <Ionicons name="copy-outline" size={18} color={colors.textSub} />
    </TouchableOpacity>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.content} accessibilityLabel={t("Yükleniyor")} accessibilityRole="progressbar">
      <View style={[styles.skeleton, { height: 140 }]} />
      <View style={[styles.skeleton, { height: 170, marginTop: 16 }]} />
      <View style={[styles.skeleton, { height: 140, marginTop: 16 }]} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

// ── Bond tree ─────────────────────────────────────────────────────────────────

function vitalityText(tree: TreeState): string {
  if (tree.stage === 0) return t("İlk anını kaydet, tohum filizlensin 🌱");
  if (tree.vitality === "resting") return t("Ağacın dinleniyor. Bir an onu uyandırır 🌙");
  if (tree.vitality === "thriving") return t("Ağacın ışıl ışıl ✨");
  return t("Ağacın büyüyor 🌿");
}

function TreeCard({ tree, onPress }: { tree: TreeState; onPress: () => void }) {
  const stageName = t(TREE_STAGES[tree.stage].name);
  return (
    <TouchableOpacity
      style={styles.treeCard}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t("Bağ ağacın: {stage}. {moments} an. {status}", { stage: stageName, moments: tree.moments, status: vitalityText(tree) })}
      accessibilityHint={t("Ağacın nasıl büyüdüğünü gösterir")}
    >
      <BondTree tree={tree} size={120} />
      <View style={styles.treeInfo}>
        <Text style={styles.treeKicker}>{t("Bağ ağacın")}</Text>
        <Text style={styles.treeStage}>{stageName}</Text>
        <Text style={styles.treeStatus}>{vitalityText(tree)}</Text>
        <View style={styles.treeBarTrack}>
          <View style={[styles.treeBarFill, { width: `${Math.round(tree.progress * 100)}%` }]} />
        </View>
        <Text style={styles.treeNext}>
          {tree.toNext > 0 ? t("{count} an daha ve ağacın büyüyecek", { count: tree.toNext }) : t("Ağacın en güzel halinde 🌸")}
        </Text>
        {tree.blossoms > 0 ? (
          <Text style={styles.treeBlossoms}>{t("Bu hafta {count} çiçek açtı", { count: tree.blossoms })}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function TreeInfoModal({ visible, tree, onClose }: { visible: boolean; tree: TreeState; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.treeBackdrop} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
        <View style={styles.treeSheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.treeSheetTitle} accessibilityRole="header">{t("Bağ ağacın nasıl büyür?")}</Text>
          <Text style={styles.treeSheetBody}>
            {t("Kaydettiğin her an ağacına bir yaprak ekler. Bu hafta konuştuğun her kişi bir çiçek açtırır. Ağacın asla solmaz; sen uzaktayken sadece dinlenir.")}
          </Text>
          {TREE_STAGES.map((st, i) => {
            const reached = tree.stage >= i;
            return (
              <View key={st.name} style={styles.treeStageRow} accessible accessibilityLabel={`${t(st.name)}, ${t("{count} an", { count: st.at })}${reached ? `, ${t("ulaşıldı")}` : ""}`}>
                <Ionicons name={reached ? "checkmark-circle" : "ellipse-outline"} size={20} color={reached ? colors.success : colors.textMuted} />
                <Text style={[styles.treeStageName, reached && { color: colors.text }]}>{t(st.name)}</Text>
                <Text style={styles.treeStageAt}>{t("{count} an", { count: st.at })}</Text>
              </View>
            );
          })}
          <TouchableOpacity style={styles.treeSheetBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.treeSheetBtnText}>{t("Tamam")}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },

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
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: colors.onFill, fontSize: 11, fontWeight: "800" },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 },

  treeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 14,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  treeInfo: { flex: 1, minWidth: 0 },
  treeKicker: { fontSize: 13, fontWeight: "800", color: colors.warmStrong, textTransform: "uppercase", letterSpacing: 0.8 },
  treeStage: { fontSize: 20, fontWeight: "900", color: colors.text, marginTop: 2 },
  treeStatus: { fontSize: 14, fontWeight: "600", color: colors.textSub, marginTop: 2 },
  treeBarTrack: { height: 8, borderRadius: 4, backgroundColor: colors.borderLight, marginTop: 10, overflow: "hidden" },
  treeBarFill: { height: 8, borderRadius: 4, backgroundColor: colors.success },
  treeNext: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 6 },
  treeBlossoms: { fontSize: 13, fontWeight: "700", color: colors.warmStrong, marginTop: 4 },
  treeBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 20 },
  treeSheet: { backgroundColor: colors.surface, borderRadius: 24, padding: 22 },
  treeSheetTitle: { fontSize: 20, fontWeight: "900", color: colors.text },
  treeSheetBody: { fontSize: 15, lineHeight: 22, color: colors.textSub, marginTop: 8, marginBottom: 12 },
  treeStageRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  treeStageName: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.textSub },
  treeStageAt: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  treeSheetBtn: { marginTop: 14, minHeight: 50, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  treeSheetBtnText: { color: colors.onFill, fontSize: 16, fontWeight: "800" },

  weekCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ringValue: { fontSize: 24, fontWeight: "900", color: colors.text },
  ringLabel: { fontSize: 12, fontWeight: "700", color: colors.textSub },
  weekRight: { flex: 1, gap: 12 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flame: { fontSize: 30 },
  streakTextCol: { flex: 1, minWidth: 0 },
  streakValue: { fontSize: 20, fontWeight: "900", color: colors.text },
  streakSub: { fontSize: 13, color: colors.textSub, fontWeight: "600", marginTop: 1 },
  weekMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  metaPillText: { fontSize: 13, fontWeight: "800", color: colors.text },
  healthDot: { width: 8, height: 8, borderRadius: 4 },

  podCard: { marginTop: 16, borderRadius: radius.card, padding: 18 },
  podKicker: { fontSize: 13, fontWeight: "800", color: colors.accent, textTransform: "uppercase", letterSpacing: 0.8 },
  podTop: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  podName: { fontSize: 22, fontWeight: "900", color: colors.text },
  podReason: { fontSize: 15, color: colors.text, marginTop: 4, lineHeight: 20 },
  podActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  podPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  podPrimaryText: { color: colors.onFill, fontSize: 16, fontWeight: "800" },
  podIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: { marginTop: 24, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  seeAll: { fontSize: 15, fontWeight: "700", color: colors.primary },
  miniRingText: { fontSize: 13, fontWeight: "900", color: colors.accent },

  list: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: "hidden" },
  sparkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sparkCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text, lineHeight: 20 },
  sparkTextDone: { color: colors.textSub, textDecorationLine: "line-through" },

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
  todayDays: { fontSize: 13, fontWeight: "700", color: colors.textSub },
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
  doneText: { color: colors.onFill, fontSize: 15, fontWeight: "800" },
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

  memoryCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.warningSoft,
  },
  memoryEmoji: { fontSize: 28 },
  memoryKicker: { fontSize: 13, fontWeight: "800", color: colors.warning },
  memoryText: { fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 2 },

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
  tagline: { marginTop: 24, textAlign: "center", fontSize: 13, fontWeight: "700", color: colors.textSub, letterSpacing: 0.3 },

  emptyCard: { alignItems: "center", padding: 24, borderRadius: radius.card, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
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
  primaryButtonText: { color: colors.onFill, fontSize: 16, fontWeight: "800" },
  secondaryButton: { alignSelf: "stretch", minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: "700" },

  skeleton: { backgroundColor: colors.borderLight, borderRadius: radius.card },
});
