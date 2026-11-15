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
import { isSnoozed } from "../utils/reminderInterval";
import { daysSinceLastContact, dueContacts, hasAnyHistory, upcomingContacts, weekStats } from "../utils/stats";
import Avatar from "../components/Avatar";
import { locale, t, tv } from "../i18n";

const TEAL = colors.primary;
const TEAL_DARK = colors.primaryDark;
const TEXT = colors.text;
const SUB = colors.textSub;
const MUTED = colors.textMuted;
const BORDER = colors.borderLight;
const WHITE = colors.surface;






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


/**
 * "İçgörüler" section shown on Profile (it used to be a tab inside Evren).
 * Profile already shows total people, moments this week, who is due and the
 * follow-up status, so those are not repeated here.
 */
export default function InsightsSection({ navigation }: any) {
  const { width } = useWindowDimensions();

  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [threshold, setThreshold] = useState(14);
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  const isCompact = width < 380;

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
        setWeeklyGoal(s.weeklyGoal || 3);
      });
    }, [])
  );

  const data = useMemo(() => {
    const active = contacts.filter((c) => !isSnoozed(c));
    const week = weekStats(contacts, weeklyGoal);
    const due = dueContacts(active, threshold);
    const upcoming = upcomingContacts(active, threshold, 7);
    const known = hasAnyHistory(contacts);

    const strongConnections = active
      .map((c) => ({ c, d: daysSinceLastContact(c) }))
      .filter((x): x is { c: ContactForm; d: number } => x.d !== null && x.d <= 7)
      .sort((a, b) => a.d - b.d)
      .map((x) => x.c);

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

    const first = due[0];
    const firstDays = first ? daysSinceLastContact(first) : null;
    const focusText = !known
      ? t("Henüz görüşme kaydı yok")
      : due.length > 0
        ? t("Görüşme zamanı gelen {count} kişi var", { count: due.length })
        : upcoming.length > 0
          ? t("{count} kişiyle görüşme zamanı yaklaşıyor", { count: upcoming.length })
          : t("Görüşme zamanı gelen kimse yok");

    const insightText = !known
      ? t("Bir görüşme kaydettiğinde burada gerçek verilerinle özet göreceksin.")
      : first && firstDays !== null
        ? t("{name} ile en son {days} gün önce görüştün.", { name: first.fullName, days: firstDays })
        : first
          ? t("{name} için henüz görüşme kaydı yok.", { name: first.fullName })
          : week.people > 0
            ? t("Bu hafta {count} kişiyle görüştün.", { count: week.people })
            : t("Bu hafta henüz görüşme kaydetmedin.");

    return { week, due, upcoming, known, strongConnections, birthdayList, relationshipMix, focusText, insightText };
  }, [contacts, threshold, weeklyGoal]);

  const priorityList: { contact: ContactForm; label: string; tone: string }[] = [
    ...data.due.map((c) => {
      const d = daysSinceLastContact(c);
      return { contact: c, label: d === null ? t("Görüşme kaydı yok") : t("{days} gündür görüşülmedi", { days: d }), tone: colors.warning };
    }),
    ...data.upcoming.map(({ contact, inDays }) => ({
      contact,
      label: inDays === 0 ? t("Bugün") : t("{days} gün sonra", { days: inDays }),
      tone: colors.primary,
    })),
  ].slice(0, 5);

  return (
    <View style={[styles.section, isCompact && styles.sectionCompact]}>
      {data.known ? (
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroKicker}>{t("Genel görünüm")}</Text>
              <Text style={styles.heroTitle}>{data.focusText}</Text>
              <Text style={styles.heroDesc}>{data.insightText}</Text>
            </View>

          </View>

          <View style={styles.heroProgressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{t("Haftalık hedef")}</Text>
              <Text style={styles.progressValue} accessibilityLabel={t("Haftalık hedef: {done} / {goal} kişi", { done: data.week.people, goal: data.week.goal })}>
                {data.week.people}/{data.week.goal}
              </Text>
            </View>

            <ProgressBar value={clamp(Math.round((data.week.people / data.week.goal) * 100))} color={TEAL} />
            <Text style={styles.weekRange}>{weekRangeText(data.week.start, data.week.end)} · {t("görüştüğün farklı kişiler")}</Text>
          </View>
        </View>
      ) : null}

        <SectionTitle
          title={t("Görüşme zamanı gelen ve yaklaşanlar")}
        />

        {priorityList.length > 0 ? (
          <View style={styles.stack}>
            {priorityList.map(({ contact: c, label, tone }, i) => (
              <PriorityCard
                key={`${c.id ?? c.fullName}-${i}`}
                contact={c}
                label={label}
                tone={tone}
                onPress={() => navigation.navigate("PersonDetail", { contact: c })}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title={data.known ? t("Önümüzdeki 7 günde görüşme zamanı gelen kimse yok") : t("Henüz görüşme kaydı yok")}
            desc={data.known ? t("Hatırlatmalar görüşme aralıklarına göre hesaplanır.") : t("Bir kişiyle görüştüğünde “Görüştüm” ile kaydet; hatırlatmalar buna göre hesaplanır.")}
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
                  rightText={dayLabel(daysSinceLastContact(c) ?? 0)}
                  onPress={() => navigation.navigate("PersonDetail", { contact: c })}
                />
              ))}
            </View>
          </>
        ) : null}

    </View>
  );
}



function weekRangeText(start: Date, end: Date) {
  const f = (d: Date) => d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
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
  return (
    <TouchableOpacity style={styles.priorityCard} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`${contact.fullName}, ${label}`}>
      <Avatar name={contact.fullName} avatarId={contact.avatarId} size={44} />

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
  return (
    <TouchableOpacity style={styles.birthdayCard} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`${contact.fullName}, ${label}`}>
      <Avatar name={contact.fullName} avatarId={contact.avatarId} size={48} />

      <Text style={styles.birthdayName} numberOfLines={1}>
        {contact.fullName.split(" ")[0]}
      </Text>

      <Text style={styles.birthdayLabel}>{label}</Text>
    </TouchableOpacity>
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
  return (
    <TouchableOpacity style={styles.compactRow} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`${contact.fullName}, ${rightText}`}>
      <Avatar name={contact.fullName} avatarId={contact.avatarId} size={40} />

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
  section: { gap: 0 },
  sectionCompact: { gap: 0 },
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

  weekRange: { fontSize: 12, color: colors.textSub, marginTop: 8 },
  noDataText: { fontSize: 13, lineHeight: 19, color: colors.textSub, marginTop: 4 },
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