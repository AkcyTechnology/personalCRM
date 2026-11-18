import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ContactForm } from "../screens/AddContactScreen";
import Avatar from "./Avatar";
import { recentWeeks } from "../utils/stats";
import { nextReminderISO } from "../utils/peopleFilters";
import { addDays, parseISODate, toISODate } from "../utils/dates";
import { colors } from "../theme/colors";
import { locale, t, tv } from "../i18n";

type Props = {
  contacts: ContactForm[];
  threshold: number;
  weeklyGoal: number;
  onOpenPerson: (c: ContactForm) => void;
};

const MAX_TIMELINE = 5;
const WEEKS = 4;
const CHART_H = 72;

/**
 * İçgörüler on Profile, in this order: Görüşme aktivitesi (weekly goal plus
 * the last four weeks), Bağlantılar, Yaklaşan görüşmeler. The goal and the
 * chart use one measure: different people met per Monday–Sunday week.
 */
export default function ProfileInsights({ contacts, threshold, weeklyGoal, onOpenPerson }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const today = toISODate(now);
    const end = toISODate(addDays(now, 7));

    const weeks = recentWeeks(contacts, WEEKS, now);

    const upcoming = contacts
      .map((c) => ({ c, date: nextReminderISO(c, threshold) }))
      .filter((x): x is { c: ContactForm; date: string } => !!x.date && x.date <= end)
      .map((x) => ({ ...x, due: x.date <= today }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.c.fullName.localeCompare(b.c.fullName, "tr"));

    const counts = new Map<string, number>();
    for (const c of contacts) {
      const key = c.relationship?.trim() || "Diğer";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || tv(a[0]).localeCompare(tv(b[0]), "tr"));

    return { weeks, upcoming, groups };
  }, [contacts, threshold]);

  const { weeks, upcoming, groups } = data;
  const goal = Math.max(1, weeklyGoal || 3);
  const done = weeks[WEEKS - 1].people;
  const pct = Math.min(1, done / goal);
  const empty = weeks.every((w) => w.people === 0);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.people));
  const total = contacts.length;

  return (
    <View style={styles.wrap}>
      {/* ── Görüşme aktivitesi ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole="header">{t("Görüşme aktivitesi")}</Text>
        <View style={styles.goalHead}>
          <Text style={styles.label}>{t("Haftalık hedef")}</Text>
          <Text style={styles.goalValue}>{t("{done} / {goal} kişi", { done, goal })}</Text>
        </View>
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("Haftalık hedef: {done} / {goal} kişi", { done, goal })}
          accessibilityValue={{ min: 0, max: goal, now: Math.min(done, goal) }}
        >
          <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>

        <View style={styles.divider} />
        <Text style={styles.label}>{t("Son 4 hafta")}</Text>
        {empty ? (
          <Text style={styles.muted}>{t("Son 4 haftada görüşme kaydı yok")}</Text>
        ) : (
          <View style={styles.chart}>
            {weeks.map((w, i) => {
              const current = i === WEEKS - 1;
              const label = current ? t("Bu hafta") : w.start.toLocaleDateString(locale(), { day: "numeric", month: "short" });
              return (
                <View
                  key={w.start.toISOString()}
                  style={styles.col}
                  accessible
                  accessibilityLabel={t("{week}: {count} kişi", { week: label, count: w.people })}
                >
                  <Text style={[styles.colValue, current && styles.colValueNow]}>{w.people}</Text>
                  <View style={styles.colArea}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(w.people > 0 ? 6 : 2, Math.round((w.people / maxWeek) * CHART_H)) },
                        current ? styles.barNow : styles.barPast,
                      ]}
                    />
                  </View>
                  <Text style={[styles.colLabel, current && styles.colLabelNow]} numberOfLines={1}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Bağlantılar ── */}
      <Text style={styles.title} accessibilityRole="header">{t("Bağlantılar")}</Text>
      {groups.length === 0 ? (
        <Text style={styles.line}>{t("Henüz kişi eklenmedi")}</Text>
      ) : groups.length === 1 ? (
        <Text style={styles.line}>{t("{circle} · {count} kişi", { circle: tv(groups[0][0]), count: groups[0][1] })}</Text>
      ) : (
        <View style={styles.list}>
          {groups.map(([label, count]) => {
            const share = count / total;
            return (
              <View
                key={label}
                style={styles.groupRow}
                accessible
                accessibilityLabel={t("{circle}: {count} kişi, yüzde {pct}", { circle: tv(label), count, pct: Math.round(share * 100) })}
              >
                <Text style={styles.groupLabel} numberOfLines={1}>{tv(label)}</Text>
                <View style={styles.groupTrack}>
                  <View style={[styles.groupFill, { width: `${Math.round(share * 100)}%` }]} />
                </View>
                <Text style={styles.groupCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Yaklaşan görüşmeler ── */}
      <Text style={styles.title} accessibilityRole="header">{t("Yaklaşan görüşmeler")}</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.line}>{t("Önümüzdeki 7 gün için hatırlatma yok")}</Text>
      ) : (
        <View style={styles.timeline}>
          {upcoming.slice(0, MAX_TIMELINE).map(({ c, date, due }, i, arr) => (
            <TouchableOpacity
              key={c.id ?? c.fullName}
              style={styles.tlRow}
              onPress={() => onOpenPerson(c)}
              accessibilityRole="button"
              accessibilityLabel={`${dateLabel(date, due)}, ${c.fullName}`}
            >
              <Text style={[styles.tlDate, due && styles.tlDateDue]}>{dateLabel(date, due)}</Text>
              <View style={styles.tlRail}>
                <View style={[styles.tlDot, due && styles.tlDotDue]} />
                {i < arr.length - 1 ? <View style={styles.tlLine} /> : null}
              </View>
              <Avatar name={c.fullName} avatarId={c.avatarId} size={32} />
              <Text style={styles.tlName} numberOfLines={1}>{c.fullName}</Text>
            </TouchableOpacity>
          ))}
          {upcoming.length > MAX_TIMELINE ? (
            <Text style={styles.more}>{t("+{count} kişi daha", { count: upcoming.length - MAX_TIMELINE })}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function dateLabel(iso: string, due: boolean): string {
  if (due) return t("Bugün");
  const d = parseISODate(iso);
  if (!d) return iso;
  const tomorrow = toISODate(addDays(new Date(), 1));
  if (iso === tomorrow) return t("Yarın");
  return d.toLocaleDateString(locale(), { day: "numeric", month: "short", weekday: "short" });
}

const card = { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border } as const;

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.text, marginTop: 16 },
  line: { fontSize: 14, lineHeight: 20, color: colors.textSub },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: colors.text },
  muted: { fontSize: 13, lineHeight: 18, color: colors.textSub, paddingVertical: 8 },

  card: { ...card, padding: 14, gap: 8 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.text },
  goalHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  goalValue: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.primary, fontVariant: ["tabular-nums"] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.borderLight, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },

  chart: { flexDirection: "row", gap: 8, paddingTop: 2 },
  col: { flex: 1, alignItems: "center", gap: 4, minWidth: 0 },
  colValue: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: colors.textSub, fontVariant: ["tabular-nums"] },
  colValueNow: { color: colors.primary, fontWeight: "600" },
  colArea: { height: CHART_H, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "62%", maxWidth: 40, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barPast: { backgroundColor: colors.primaryBorder },
  barNow: { backgroundColor: colors.primary },
  colLabel: { fontSize: 12, lineHeight: 16, color: colors.textSub },
  colLabelNow: { color: colors.text, fontWeight: "600" },

  list: { ...card, paddingHorizontal: 14, paddingVertical: 6 },
  groupRow: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10 },
  groupLabel: { width: 104, fontSize: 14, lineHeight: 20, color: colors.text },
  groupTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.borderLight, overflow: "hidden" },
  groupFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  groupCount: { minWidth: 24, textAlign: "right", fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },

  timeline: { ...card, paddingVertical: 4, paddingHorizontal: 12 },
  tlRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 },
  tlDate: { width: 78, fontSize: 13, lineHeight: 18, color: colors.textSub },
  tlDateDue: { color: colors.primary, fontWeight: "600" },
  tlRail: { width: 10, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  tlDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  tlDotDue: { backgroundColor: colors.primary },
  tlLine: { position: "absolute", top: "60%", bottom: -8, width: 1, backgroundColor: colors.border },
  tlName: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "500", color: colors.text },
  more: { fontSize: 13, lineHeight: 18, color: colors.textSub, paddingVertical: 8, paddingLeft: 88 },
});
