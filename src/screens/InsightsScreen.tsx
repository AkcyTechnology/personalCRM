import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { loadContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import type { ContactForm } from "./AddContactScreen";
import { categorical, colors } from "../theme/colors";
import { isDue, isSnoozed, effectiveIntervalDays, neglectScore } from "../utils/reminderInterval";
import { averageHealthScore, healthScoreColor } from "../utils/healthScore";
import HealthInfoModal from "../components/HealthInfoModal";
import { t, tv } from "../i18n";

const TEAL = colors.primary;
const TEAL_DARK = colors.primaryDark;
const TEXT = colors.text;
const SUB = colors.textSub;
const MUTED = colors.textMuted;
const BORDER = colors.borderLight;
const WHITE = colors.surface;

type InsightTone = "teal" | "green" | "amber" | "red" | "blue" | "purple";

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
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(name: string) {
  const palette = categorical();

  let h = 0;
  for (const c of name) h += c.charCodeAt(0);

  return palette[h % palette.length];
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function nextBirthdayInfo(birthday?: string) {
  if (!birthday) return null;

  const parts = birthday.split(/[./-]/).map(Number);

  let day: number | undefined;
  let month: number | undefined;

  if (parts.length >= 3) {
    if (String(parts[0]).length === 4) {
      month = parts[1];
      day = parts[2];
    } else {
      day = parts[0];
      month = parts[1];
    }
  }

  if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), month - 1, day);

  if (next < today) {
    next.setFullYear(now.getFullYear() + 1);
  }

  const daysLeft = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);

  return {
    daysLeft,
    label: daysLeft === 0 ? t("Bugün") : t("{days} gün kaldı", { days: daysLeft }),
  };
}

function contactSubtitle(c: ContactForm) {
  return [c.jobTitle, c.company].filter(Boolean).join(" · ") || c.relationship || t("Kişisel bağlantı");
}

function dayLabel(days: number) {
  if (days <= 0) return t("Bugün");
  if (days === 1) return t("Dün");
  if (days >= 9999) return t("Tarih yok");

  return t("{days} gün önce", { days });
}

function toneColor(tone: InsightTone) {
  const map: Record<InsightTone, string> = {
    teal: TEAL,
    green: colors.success,
    amber: colors.warning,
    red: colors.danger,
    blue: colors.warm,
    purple: colors.accent,
  };

  return map[tone];
}

export default function InsightsScreen({ navigation, embedded }: any) {
  const { width } = useWindowDimensions();

  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [threshold, setThreshold] = useState(14);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);

  const isCompact = width < 380;

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
      });
    }, [])
  );

  const data = useMemo(() => {
    const active = contacts.filter((c) => !isSnoozed(c));

    const contactedThisWeek = active.filter((c) => daysSince(c.lastContactDate) <= 7);

    const needsAttention = [...active]
      .filter((c) => isDue(c, threshold))
      .sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate));

    const atRisk = [...active]
      .filter((c) => {
        const d = daysSince(c.lastContactDate);
        const interval = effectiveIntervalDays(c, threshold);
        return d >= Math.floor(interval * 0.7) && d < interval;
      })
      .sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate));

    const strongConnections = [...active]
      .filter((c) => daysSince(c.lastContactDate) <= 7)
      .sort((a, b) => daysSince(a.lastContactDate) - daysSince(b.lastContactDate));

    const mostNeglected = [...active]
      .filter((c) => neglectScore(c, threshold) > 0)
      .sort((a, b) => neglectScore(b, threshold) - neglectScore(a, threshold))
      .slice(0, 5);

    const birthdayList = active
      .map((c) => ({
        contact: c,
        birthday: nextBirthdayInfo(c.birthday),
      }))
      .filter(
        (
          x
        ): x is {
          contact: ContactForm;
          birthday: { daysLeft: number; label: string };
        } => !!x.birthday && x.birthday.daysLeft <= 30
      )
      .sort((a, b) => a.birthday.daysLeft - b.birthday.daysLeft);

    const relationshipCounts = contacts.reduce<Record<string, number>>((acc, c) => {
      const key = (c.relationship || t("Diğer")).trim() || t("Diğer");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const relationshipMix = Object.entries(relationshipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const averageHealth = averageHealthScore(active, threshold);

    const weeklyGoal = Math.min(Math.max(3, Math.ceil(contacts.length * 0.15)), 8);

    const weeklyProgress =
      active.length === 0
        ? 0
        : clamp(Math.round((contactedThisWeek.length / weeklyGoal) * 100));

    const healthyConnections =
      active.length === 0
        ? 0
        : clamp(Math.round(((active.length - needsAttention.length) / active.length) * 100));

    const focusText =
      needsAttention.length > 0
        ? t("Görüşmek isteyebileceğin {count} kişi var", { count: needsAttention.length })
        : atRisk.length > 0
        ? t("{count} bağı yakında hatırlamak iyi olur", { count: atRisk.length })
        : t("Bağların güzel görünüyor");

    const insightText =
      needsAttention.length > 0
        ? t("{name} ile {days} gündür konuşmadınız.", { name: needsAttention[0].fullName, days: daysSince(needsAttention[0].lastContactDate) })
        : atRisk.length > 0
        ? t("{name} ile görüşme zamanı {days} gün sonra.", { name: atRisk[0].fullName, days: effectiveIntervalDays(atRisk[0], threshold) - daysSince(atRisk[0].lastContactDate) })
        : contactedThisWeek.length > 0
        ? t("Bu hafta {count} kişiyle bağ kurdun.", { count: contactedThisWeek.length })
        : t("Bu hafta küçük bir merhaba ile başlayabilirsin.");

    return {
      contactedThisWeek,
      needsAttention,
      atRisk,
      strongConnections,
      mostNeglected,
      birthdayList,
      relationshipMix,
      averageHealth,
      weeklyGoal,
      weeklyProgress,
      healthyConnections,
      focusText,
      insightText,
    };
  }, [contacts, threshold]);

  const priorityList = [...data.needsAttention, ...data.atRisk]
    .sort((a, b) => neglectScore(b, threshold) - neglectScore(a, threshold))
    .slice(0, 4);

  return (
    <View style={styles.screen}>
      {embedded ? null : <InsightsHeader />}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isCompact && styles.contentCompact,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroKicker}>{t("Genel görünüm")}</Text>
              <Text style={styles.heroTitle}>{data.focusText}</Text>
              <Text style={styles.heroDesc}>{data.insightText}</Text>
            </View>

            <HealthBadge value={data.averageHealth} />
          </View>

          <View style={styles.heroProgressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t("Haftalık hedef")}</Text>
              <Text style={styles.progressValue} accessibilityLabel={t("Haftalık hedef: {done} / {goal}", { done: data.contactedThisWeek.length, goal: data.weeklyGoal })}>
                {data.contactedThisWeek.length}/{data.weeklyGoal}
              </Text>
            </View>

            <ProgressBar value={data.weeklyProgress} color={TEAL} />
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            label={t("Toplam")}
            value={contacts.length}
            tone="teal"
          />

          <MetricCard
            label={t("Bu hafta")}
            value={data.contactedThisWeek.length}
            tone="green"
          />

          <MetricCard
            label={t("Yeniden bağlan")}
            value={data.needsAttention.length}
            tone="red"
          />

          <MetricCard
            label={t("Özel gün")}
            value={data.birthdayList.length}
            tone="amber"
          />
        </View>

        <SectionTitle
          title={t("Görüşmek isteyebileceklerin")}
        />

        {priorityList.length > 0 ? (
          <View style={styles.stack}>
            {priorityList.map((c, i) => {
              const days = daysSince(c.lastContactDate);
              const interval = effectiveIntervalDays(c, threshold);
              const isLate = days >= interval;

              return (
                <PriorityCard
                  key={`${c.fullName}-${i}`}
                  contact={c}
                  label={isLate ? t("{days} gündür görüşülmedi", { days }) : t("{days} gün kaldı", { days: interval - days })}
                  tone={isLate ? colors.danger : colors.warning}
                  onPress={() => navigation.navigate("PersonDetail", { contact: c })}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState
            title={t("Herkesle bağın taze ✨")}
            desc={t("Harika gidiyorsun!")}
          />
        )}

        {data.birthdayList.length > 0 ? (
          <>
            <SectionTitle
              title={t("Yaklaşan özel günler")}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.birthdayRow}
            >
              {data.birthdayList.slice(0, 8).map(({ contact, birthday }, i) => (
                <BirthdayCard
                  key={`${contact.fullName}-${i}`}
                  contact={contact}
                  label={birthday.label}
                  onPress={() => navigation.navigate("PersonDetail", { contact })}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionTitle
          title={t("Bağlantın")}
          onInfoPress={() => setHealthInfoOpen(true)}
        />

        <View style={styles.card}>
          <HealthRow
            label={t("Genel sağlık")}
            value={data.averageHealth}
            color={healthScoreColor(data.averageHealth)}
          />

          <HealthRow
            label={t("Haftalık hedef")}
            value={data.weeklyProgress}
            color={TEAL}
          />

          <HealthRow
            label={t("Sağlıklı bağlantılar")}
            value={data.healthyConnections}
            color={colors.accent}
            last
          />
        </View>

        {data.relationshipMix.length > 0 ? (
          <>
            <SectionTitle
              title={t("Bağlantı dağılımı")}
            />

            <View style={styles.card}>
              {data.relationshipMix.map(([label, count], i) => (
                <MixRow
                  key={label}
                  label={label}
                  count={count}
                  total={contacts.length}
                  color={categorical()[i % 6]}
                  last={i === data.relationshipMix.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}

        {data.strongConnections.length > 0 ? (
          <>
            <SectionTitle
              title={t("Güçlü bağlantılar")}
            />

            <View style={styles.stack}>
              {data.strongConnections.slice(0, 4).map((c, i) => (
                <CompactPerson
                  key={`${c.fullName}-strong-${i}`}
                  contact={c}
                  rightText={dayLabel(daysSince(c.lastContactDate))}
                  onPress={() => navigation.navigate("PersonDetail", { contact: c })}
                />
              ))}
            </View>
          </>
        ) : null}

      </ScrollView>

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />
    </View>
  );
}

function InsightsHeader() {
  return (
    <View style={styles.appBar}>
      <View style={styles.appBarText}>
        <Text style={styles.appTitle} accessibilityRole="header">{t("Analiz")}</Text>
      </View>
    </View>
  );
}

function HealthBadge({ value }: { value: number }) {
  return (
    <View style={styles.healthBadge}>
      <Text style={styles.healthBadgeValue}>{value}</Text>
      <Text style={styles.healthBadgeLabel}>{t("Skor")}</Text>
    </View>
  );
}

function MetricCard({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number;
  caption?: string;
  tone: InsightTone;
}) {
  const color = toneColor(tone);

  return (
    <View style={styles.metricCard} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.metricTop}>
        <View style={[styles.metricMark, { backgroundColor: color + "18" }]}>
          <View style={[styles.metricDot, { backgroundColor: color }]} />
        </View>

        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>

      <Text style={styles.metricLabel}>{label}</Text>
      {caption ? <Text style={styles.metricCaption}>{caption}</Text> : null}
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
  onInfoPress,
}: {
  title: string;
  subtitle?: string;
  onInfoPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {onInfoPress ? (
            <TouchableOpacity onPress={onInfoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSub} accessibilityLabel={t("Bilgi")} />
            </TouchableOpacity>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function PriorityCard({
  contact,
  label,
  tone,
  onPress,
}: {
  contact: ContactForm;
  label: string;
  tone: string;
  onPress?: () => void;
}) {
  const color = avatarColor(contact.fullName);

  return (
    <TouchableOpacity style={styles.priorityCard} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: color + "16",
            borderColor: color + "35",
          },
        ]}
      >
        <Text style={[styles.avatarText, { color }]}>{initials(contact.fullName)}</Text>
      </View>

      <View style={styles.personInfo}>
        <Text style={styles.personName} numberOfLines={1}>
          {contact.fullName}
        </Text>

        <Text style={styles.personSub} numberOfLines={1}>
          {contactSubtitle(contact)}
        </Text>
      </View>

      <View style={[styles.statusPill, { backgroundColor: tone + "14" }]}>
        <Text style={[styles.statusText, { color: tone }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function BirthdayCard({
  contact,
  label,
  onPress,
}: {
  contact: ContactForm;
  label: string;
  onPress?: () => void;
}) {
  const color = avatarColor(contact.fullName);

  return (
    <TouchableOpacity style={styles.birthdayCard} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.birthdayAvatar,
          {
            backgroundColor: color + "16",
            borderColor: color + "30",
          },
        ]}
      >
        <Text style={[styles.birthdayInitials, { color }]}>
          {initials(contact.fullName)}
        </Text>
      </View>

      <Text style={styles.birthdayName} numberOfLines={1}>
        {contact.fullName.split(" ")[0]}
      </Text>

      <Text style={styles.birthdayLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function HealthRow({
  label,
  value,
  color,
  last,
}: {
  label: string;
  value: number;
  color: string;
  last?: boolean;
}) {
  return (
    <View
      style={[styles.healthRow, !last && styles.rowDivider]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: clamp(value), text: `${clamp(value)}%` }}
    >
      <View style={styles.healthRowTop}>
        <Text style={styles.healthRowLabel}>{label}</Text>
        <Text style={[styles.healthRowValue, { color }]}>{value}%</Text>
      </View>

      <ProgressBar value={value} color={color} />
    </View>
  );
}

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${clamp(value)}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

function MixRow({
  label,
  count,
  total,
  color,
  last,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  last?: boolean;
}) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <View
      style={[styles.mixRow, !last && styles.rowDivider]}
      accessible
      accessibilityLabel={t("{circle}: {count} kişi, yüzde {pct}", { circle: tv(label), count, pct })}
    >
      <View style={[styles.mixDot, { backgroundColor: color }]} />

      <View style={styles.mixInfo}>
        <Text style={styles.mixLabel}>{tv(label)}</Text>
        <View style={styles.mixProgressTrack}>
          <View
            style={[
              styles.mixProgressFill,
              {
                width: `${pct}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.mixRight}>
        <Text style={styles.mixCount}>{count}</Text>
        <Text style={styles.mixPct}>{pct}%</Text>
      </View>
    </View>
  );
}

function CompactPerson({
  contact,
  rightText,
  onPress,
}: {
  contact: ContactForm;
  rightText: string;
  onPress?: () => void;
}) {
  const color = avatarColor(contact.fullName);

  return (
    <TouchableOpacity style={styles.compactRow} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.compactAvatar,
          {
            backgroundColor: color + "16",
            borderColor: color + "30",
          },
        ]}
      >
        <Text style={[styles.compactInitials, { color }]}>
          {initials(contact.fullName)}
        </Text>
      </View>

      <View style={styles.personInfo}>
        <Text style={styles.personName} numberOfLines={1}>
          {contact.fullName}
        </Text>

        <Text style={styles.personSub} numberOfLines={1}>
          {contactSubtitle(contact)}
        </Text>
      </View>

      <Text style={styles.rightLabel}>{rightText}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyMark}>
        <Text style={styles.emptyMarkText}>✓</Text>
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
    </View>
  );
}

const TOP_SAFE =
  Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 54;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WHITE,
  },

  appBar: {
    paddingTop: TOP_SAFE,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  appBarText: {
    flex: 1,
    paddingRight: 16,
  },

  appTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.5,
  },

  appSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: SUB,
    fontWeight: "500",
  },

  headerBadge: {
    minWidth: 66,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  headerBadgeValue: {
    fontSize: 18,
    fontWeight: "700",
    color: TEAL_DARK,
  },

  headerBadgeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: TEAL_DARK,
    opacity: 0.75,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 112,
  },

  contentCompact: {
    paddingHorizontal: 16,
  },

  heroCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: colors.textSub,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  heroTextWrap: {
    flex: 1,
  },

  heroKicker: {
    fontSize: 12,
    color: TEAL_DARK,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  heroTitle: {
    marginTop: 7,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.4,
  },

  heroDesc: {
    marginTop: 7,
    fontSize: 13,
    color: SUB,
    lineHeight: 19,
    fontWeight: "500",
  },

  healthBadge: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.primarySoft,
    borderWidth: 8,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  healthBadgeValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    color: TEAL_DARK,
  },

  healthBadgeLabel: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "600",
    color: SUB,
  },

  heroProgressBlock: {
    marginTop: 18,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressLabel: {
    fontSize: 12,
    color: SUB,
    fontWeight: "600",
  },

  progressValue: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
  },

  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },

  progressFill: {
    height: 7,
    borderRadius: 999,
  },

  metricsGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  metricCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 145,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
  },

  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  metricMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  metricDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  metricValue: {
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  metricLabel: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
  },

  metricCaption: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: SUB,
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sectionInfoIcon: {
    fontSize: 13,
    color: MUTED,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: SUB,
  },

  stack: {
    gap: 9,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },

  priorityCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 15,
    fontWeight: "700",
  },

  personInfo: {
    flex: 1,
    minWidth: 0,
  },

  personName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: TEXT,
  },

  personSub: {
    marginTop: 4,
    fontSize: 12.5,
    color: SUB,
    lineHeight: 17,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  birthdayRow: {
    gap: 10,
    paddingRight: 4,
    paddingBottom: 2,
  },

  birthdayCard: {
    width: 104,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    alignItems: "center",
  },

  birthdayAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  birthdayInitials: {
    fontSize: 15,
    fontWeight: "700",
  },

  birthdayName: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
  },

  birthdayLabel: {
    marginTop: 4,
    fontSize: 11,
    color: SUB,
    textAlign: "center",
  },

  healthRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  healthRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  healthRowLabel: {
    fontSize: 13.5,
    color: TEXT,
    fontWeight: "600",
  },

  healthRowValue: {
    fontSize: 13.5,
    fontWeight: "700",
  },

  mixRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  mixDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },

  mixInfo: {
    flex: 1,
    minWidth: 0,
  },

  mixLabel: {
    fontSize: 13.5,
    color: TEXT,
    fontWeight: "600",
  },

  mixProgressTrack: {
    marginTop: 7,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },

  mixProgressFill: {
    height: 5,
    borderRadius: 999,
  },

  mixRight: {
    minWidth: 48,
    alignItems: "flex-end",
  },

  mixCount: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
  },

  mixPct: {
    marginTop: 2,
    fontSize: 11.5,
    color: SUB,
  },

  compactRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  compactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  compactInitials: {
    fontSize: 14,
    fontWeight: "700",
  },

  rightLabel: {
    fontSize: 12,
    color: SUB,
    fontWeight: "600",
  },

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 22,
    alignItems: "center",
  },

  emptyMark: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyMarkText: {
    fontSize: 24,
    color: TEAL_DARK,
    fontWeight: "700",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
  },

  emptyDesc: {
    marginTop: 6,
    fontSize: 12.5,
    color: SUB,
    lineHeight: 18,
    textAlign: "center",
  },
});