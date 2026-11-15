import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { loadContacts, subscribeContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import type { ContactForm } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { isDue, daysSinceIntervalStart } from "../utils/reminderInterval";
import { averageHealthScore, healthScoreColor, healthScoreLabel } from "../utils/healthScore";
import {
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
import HealthInfoModal from "../components/HealthInfoModal";
import MessageComposer from "../components/MessageComposer";
import LogInteractionModal from "../components/LogInteractionModal";
import ProgressRing from "../components/ProgressRing";
import BondTree from "../components/BondTree";
import Appear from "../components/Appear";
import AnalyticsConsent from "../components/AnalyticsConsent";
import CountUp from "../components/CountUp";
import Avatar from "../components/Avatar";
import { reasonText } from "./ShuffleScreen";
import { track } from "../utils/analytics";
import { t } from "../i18n";

type IconName = keyof typeof Ionicons.glyphMap;

/** Home uses the app's standard palette (white surfaces, turquoise primary). */
const H = {
  bg: colors.bg,
  card: colors.surface,
  border: colors.border,
  text: colors.text,
  sub: colors.textSub,
  primary: colors.primary,
  onPrimary: colors.onFill,
  track: colors.borderLight,
};

const R = { card: 12, row: 10, button: 8, bar: 16 };

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [threshold, setThreshold] = useState(14);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [userName, setUserName] = useState("");
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
    return {
      due,
      pod: personOfTheDay(contacts, threshold, now),
      sparks: todaysSparks(contacts, threshold, now),
      streak: weeklyStreak(contacts, now),
      thisWeek: peopleThisWeek(contacts, now),
      tree: treeState(contacts, now),
      health: averageHealthScore(contacts, threshold),
    };
  }, [contacts, threshold]);

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
      {/* ── Greeting and top actions ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.greeting} accessibilityRole="header">
            {userName ? t("Merhaba, {name}", { name: firstName(userName) }) : t("Merhaba 👋")}
          </Text>
          <Text style={styles.greetingSub}>{subtitle}</Text>
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
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color={H.sub} />
            <Text style={styles.emptyTitle}>{t("İlk kişini ekle")}</Text>
            <Text style={styles.body}>{t("Kimi unutmak istemiyorsun?")}</Text>
            <TouchableOpacity style={[styles.primaryBtn, styles.stretch]} onPress={() => navigation.navigate("AddContact")} accessibilityRole="button">
              <Ionicons name="add" size={18} color={H.onPrimary} />
              <Text style={styles.primaryBtnText}>{t("Kişi ekle")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, styles.stretch]} onPress={() => navigation.navigate("ImportContacts")} accessibilityRole="button">
              <Ionicons name="download-outline" size={18} color={H.text} />
              <Text style={styles.secondaryBtnText}>{t("Rehberden aktar")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Person of the day ── */}
          {data.pod ? (
            <Appear index={0}>
              <View style={styles.card}>
                <Text style={styles.kicker}>{t("Günün kişisi")}</Text>
                <TouchableOpacity
                  style={styles.podTop}
                  onPress={() => goToContact(data.pod!)}
                  accessibilityRole="button"
                  accessibilityLabel={`${data.pod.fullName}. ${reasonText(reasonFor(data.pod), firstName(data.pod.fullName))}`}
                  accessibilityHint={t("Kişinin sayfasını açar")}
                >
                  <Avatar name={data.pod.fullName} avatarId={data.pod.avatarId} size={52} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name}>{data.pod.fullName}</Text>
                    <Text style={styles.body}>{reasonText(reasonFor(data.pod), firstName(data.pod.fullName))}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.podActions}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }]}
                    onPress={() => setComposerTarget(data.pod)}
                    accessibilityRole="button"
                    accessibilityHint={t("Mesaj önerisini açar; metni düzenleyip kopyalayabilirsin")}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={H.onPrimary} />
                    <Text style={styles.primaryBtnText}>{t("Merhaba de")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={() => setLogTarget(data.pod)}
                    accessibilityRole="button"
                    accessibilityLabel={t("{name} ile görüştüm", { name: data.pod.fullName })}
                    accessibilityHint={t("Görüşmeyi kaydeder")}
                  >
                    <Ionicons name="checkmark" size={22} color={H.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={() => navigation.navigate("Shuffle")}
                    accessibilityRole="button"
                    accessibilityLabel={t("Başka birini göster")}
                    accessibilityHint={t("Kartları kaydırarak başka bir kişi seçebileceğin ekranı açar")}
                  >
                    <Ionicons name="shuffle" size={22} color={H.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </Appear>
          ) : null}

          {/* ── Today's sparks ── */}
          {data.sparks.length > 0 ? (
            <Appear index={1}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">{t("Bugünün kıvılcımları")}</Text>
                <Text style={styles.meta} accessibilityLabel={t("{done} / {total} tamamlandı", { done: sparksDone, total: data.sparks.length })}>
                  {`${sparksDone}/${data.sparks.length}`}
                </Text>
              </View>
              <View style={styles.list}>
                {data.sparks.map((s, i) => (
                  <SparkRow key={s.id} spark={s} last={i === data.sparks.length - 1} onPress={() => onSpark(s)} />
                ))}
              </View>
            </Appear>
          ) : null}

          {/* ── Bond tree ── */}
          <Appear index={2}>
            <TreeCard tree={data.tree} onPress={() => setTreeInfoOpen(true)} />
          </Appear>

          {/* ── Weekly goal · streak ── */}
          <Appear index={3}>
            <View style={[styles.card, styles.weekCard]}>
              <View style={styles.weekCol}>
                <ProgressRing
                  size={64}
                  stroke={6}
                  progress={data.thisWeek / weeklyGoal}
                  color={H.primary}
                  trackColor={H.track}
                  accessibilityLabel={t("Haftalık hedef: {done} / {goal} kişi", { done: data.thisWeek, goal: weeklyGoal })}
                >
                  <CountUp value={data.thisWeek} style={styles.ringValue} format={(n) => `${n}/${weeklyGoal}`} />
                </ProgressRing>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.kicker}>{t("Haftalık hedef")}</Text>
                  <Text style={styles.meta}>{t("Bu hafta görüştüğün farklı kişiler")}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.weekCol} accessible accessibilityLabel={t("Görüşme serisi: {count} hafta", { count: data.streak.current })}>
                <View style={styles.streakIcon}>
                  <Ionicons name={data.streak.current > 0 ? "flame-outline" : "leaf-outline"} size={20} color={H.text} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.kicker}>{t("Görüşme serisi")}</Text>
                  <Text style={styles.name}>
                    {data.streak.current > 0 ? t("{count} hafta", { count: data.streak.current }) : t("Henüz başlamadı")}
                  </Text>
                  <Text style={styles.meta}>
                    {data.streak.thisWeekDone
                      ? t("Bu hafta görüşme kaydettin")
                      : t("Seri, en az bir görüşme kaydettiğin her hafta uzar")}
                  </Text>
                </View>
              </View>
              {data.streak.freezes > 0 || data.health !== null ? (
                <View style={styles.metaRow}>
                  {data.streak.freezes > 0 ? (
                    <View style={styles.pill} accessible accessibilityLabel={t("{count} dondurma hakkı", { count: data.streak.freezes })}>
                      <Ionicons name="snow-outline" size={14} color={H.sub} />
                      <Text style={styles.pillText}>{t("{count} dondurma hakkı", { count: data.streak.freezes })}</Text>
                    </View>
                  ) : null}
                  {data.health !== null ? (
                    <TouchableOpacity
                      style={styles.pill}
                      onPress={() => setHealthInfoOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t("Takip durumu: {label}. Nasıl hesaplanır?", { label: t(healthScoreLabel(data.health)) })}
                    >
                      <View style={[styles.dot, { backgroundColor: healthScoreColor(data.health) }]} />
                      <Text style={styles.pillText}>{t("Takip durumu: {label}", { label: t(healthScoreLabel(data.health)) })}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Appear>

          {/* ── Import from contacts: last, fully above the tab bar ── */}
          {contacts.length < 3 ? (
            <TouchableOpacity style={styles.importRow} onPress={() => navigation.navigate("ImportContacts")} accessibilityRole="button">
              <Ionicons name="download-outline" size={20} color={H.text} />
              <Text style={styles.importText}>{t("Rehberden kişi aktar")}</Text>
              <Ionicons name="chevron-forward" size={18} color={H.sub} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

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
      {/* "Merhaba de": the full suggestion, editable and copyable, for this person. */}
      <MessageComposer visible={!!composerTarget} contact={composerTarget} onClose={() => setComposerTarget(null)} />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconButton({ icon, label, badge, onPress }: { icon: IconName; label: string; badge?: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.iconAction} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={H.text} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} allowFontScaling={false}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function sparkContent(s: Spark): { icon: IconName; text: string } {
  switch (s.kind) {
    case "reconnect":
      return {
        icon: "paper-plane-outline",
        text: s.days > 0
          ? t("{days} gündür konuşmadığın {name}'e yaz", { days: s.days, name: firstName(s.contact.fullName) })
          : t("{name}'e bir merhaba gönder", { name: firstName(s.contact.fullName) }),
      };
    case "birthday":
      return {
        icon: "gift-outline",
        text: s.days === 0
          ? t("{name}'in doğum gününü kutla 🎂", { name: firstName(s.contact.fullName) })
          : t("{name}'in doğum günü {days} gün sonra — bir sürpriz düşün", { name: firstName(s.contact.fullName), days: s.days }),
      };
    case "followUp":
      return {
        icon: "chatbubbles-outline",
        text: t("{name}'e şunu sor: “{note}”", { name: firstName(s.contact.fullName), note: s.note.length > 40 ? `${s.note.slice(0, 40)}…` : s.note }),
      };
    default:
      return { icon: "cafe-outline", text: t("Bir arkadaşınla kahve planla") };
  }
}

function SparkRow({ spark, last, onPress }: { spark: Spark; last: boolean; onPress: () => void }) {
  const c = sparkContent(spark);
  return (
    <TouchableOpacity
      style={[styles.sparkRow, !last && styles.sparkDivider]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={spark.done ? `${c.text}, ${t("tamamlandı")}` : c.text}
      accessibilityState={{ checked: spark.done }}
    >
      <View style={[styles.sparkIcon, spark.done && styles.sparkIconDone]}>
        <Ionicons name={spark.done ? "checkmark" : c.icon} size={16} color={spark.done ? colors.onFill : H.text} />
      </View>
      <Text style={[styles.sparkText, spark.done && styles.sparkTextDone]}>{c.text}</Text>
      <Ionicons name="chevron-forward" size={18} color={H.sub} />
    </TouchableOpacity>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.content} accessibilityLabel={t("Yükleniyor")} accessibilityRole="progressbar">
      <View style={[styles.skeleton, { height: 140 }]} />
      <View style={[styles.skeleton, { height: 170, marginTop: 12 }]} />
      <View style={[styles.skeleton, { height: 140, marginTop: 12 }]} />
    </View>
  );
}

// ── Bond tree ─────────────────────────────────────────────────────────────────

function vitalityText(tree: TreeState): string {
  if (tree.stage === 0) return t("İlk görüşmeni kaydet, tohum filizlensin");
  if (tree.vitality === "resting") return t("Ağacın dinleniyor; bir görüşme onu uyandırır");
  if (tree.vitality === "thriving") return t("Ağacın canlı");
  return t("Ağacın büyüyor");
}

function TreeCard({ tree, onPress }: { tree: TreeState; onPress: () => void }) {
  const stageName = t(TREE_STAGES[tree.stage].name);
  return (
    <TouchableOpacity
      style={[styles.card, styles.treeCard]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t("Bağ ağacın: {stage}. {moments} an. {status}", { stage: stageName, moments: tree.moments, status: vitalityText(tree) })}
      accessibilityHint={t("Ağacın nasıl büyüdüğünü gösterir")}
    >
      <BondTree tree={tree} size={76} minimal />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.kicker}>{t("Bağ ağacın")}</Text>
        <Text style={styles.name}>{stageName}</Text>
        <Text style={styles.meta}>{vitalityText(tree)}</Text>
        <View style={styles.treeTrack}>
          <View style={[styles.treeFill, { width: `${Math.round(tree.progress * 100)}%` }]} />
        </View>
        <Text style={styles.meta}>
          {tree.toNext > 0 ? t("{count} an daha ve ağacın büyüyecek", { count: tree.toNext }) : t("Ağacın en büyük halinde")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function TreeInfoModal({ visible, tree, onClose }: { visible: boolean; tree: TreeState; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{t("Bağ ağacın nasıl büyür?")}</Text>
          <Text style={[styles.body, { marginTop: 6, marginBottom: 10 }]}>
            {t("Kaydettiğin her an ağacına bir yaprak ekler. Bu hafta konuştuğun her kişi bir çiçek açtırır. Ağacın asla solmaz; sen uzaktayken sadece dinlenir.")}
          </Text>
          {TREE_STAGES.map((st, i) => {
            const reached = tree.stage >= i;
            return (
              <View key={st.name} style={styles.stageRow} accessible accessibilityLabel={`${t(st.name)}, ${t("{count} an", { count: st.at })}${reached ? `, ${t("ulaşıldı")}` : ""}`}>
                <Ionicons name={reached ? "checkmark-circle" : "ellipse-outline"} size={20} color={reached ? colors.success : H.sub} />
                <Text style={[styles.body, { flex: 1, color: reached ? H.text : H.sub }]}>{t(st.name)}</Text>
                <Text style={styles.meta}>{t("{count} an", { count: st.at })}</Text>
              </View>
            );
          })}
          <TouchableOpacity style={[styles.primaryBtn, styles.stretch, { marginTop: 12 }]} onPress={onClose} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>{t("Tamam")}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: H.bg },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12 },

  // Type: weights stay at 600 for titles and 400–500 for supporting text.
  greeting: { fontSize: 20, lineHeight: 26, fontWeight: "600", color: H.text },
  greetingSub: { fontSize: 14, lineHeight: 20, fontWeight: "400", color: H.sub, marginTop: 2 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: H.text },
  name: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: H.text },
  kicker: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: H.sub },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "400", color: H.sub },
  meta: { fontSize: 13, lineHeight: 18, fontWeight: "400", color: H.sub },
  ringValue: { fontSize: 20, lineHeight: 24, fontWeight: "600", color: H.text },

  topBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: H.bg },

  card: { backgroundColor: H.card, borderRadius: R.card, borderWidth: 1, borderColor: H.border, padding: 14, gap: 10 },

  iconAction: {
    width: 48, height: 48, borderRadius: R.button, borderWidth: 1, borderColor: H.border,
    backgroundColor: H.card, alignItems: "center", justifyContent: "center",
  },
  badge: {
    position: "absolute", top: 4, right: 4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: H.primary, alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: H.onPrimary },

  primaryBtn: {
    minHeight: 48, borderRadius: R.button, backgroundColor: H.primary, flexDirection: "row", gap: 6,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 14,
  },
  primaryBtnText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: H.onPrimary },
  secondaryBtn: {
    minHeight: 48, borderRadius: R.button, borderWidth: 1, borderColor: H.border, backgroundColor: H.card, flexDirection: "row", gap: 6,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 14,
  },
  secondaryBtnText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: H.text },
  stretch: { alignSelf: "stretch" },

  podTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  podActions: { flexDirection: "row", gap: 8 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 8 },
  list: { backgroundColor: H.card, borderRadius: R.card, borderWidth: 1, borderColor: H.border, overflow: "hidden" },
  sparkRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  sparkDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: H.border },
  sparkIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: H.border, alignItems: "center", justifyContent: "center" },
  sparkIconDone: { backgroundColor: colors.success, borderColor: colors.success },
  sparkText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "400", color: H.text },
  // Done stays readable: the check says it's done; the line-through is a hint.
  sparkTextDone: { textDecorationLine: "line-through", color: H.sub },

  treeCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  treeTrack: { height: 6, borderRadius: 3, backgroundColor: H.track, marginTop: 6, overflow: "hidden" },
  treeFill: { height: 6, borderRadius: 3, backgroundColor: colors.success },

  weekCard: { gap: 12 },
  weekCol: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: H.border },
  streakIcon: { width: 64, alignItems: "center" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    minHeight: 32, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10,
    borderRadius: R.button, backgroundColor: H.bg, borderWidth: 1, borderColor: H.border,
  },
  pillText: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: H.text },
  dot: { width: 8, height: 8, borderRadius: 4 },

  bdayChip: {
    flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56, paddingHorizontal: 12,
    backgroundColor: H.card, borderRadius: R.row, borderWidth: 1, borderColor: H.border,
  },

  importRow: {
    minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14,
    backgroundColor: H.card, borderRadius: R.row, borderWidth: 1, borderColor: H.border,
  },
  importText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600", color: H.text },

  emptyCard: { backgroundColor: H.card, borderRadius: R.card, borderWidth: 1, borderColor: H.border, padding: 20, gap: 8, alignItems: "center" },
  emptyTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: H.text },

  skeleton: { borderRadius: R.card, backgroundColor: H.card, borderWidth: 1, borderColor: H.border },

  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: H.card, borderRadius: R.card, padding: 20 },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40 },
});
