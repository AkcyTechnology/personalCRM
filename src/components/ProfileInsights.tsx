import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ContactForm } from "../screens/AddContactScreen";
import Avatar from "./Avatar";
import { connectionStatus, healthScoreColor, healthScoreLabel, MIN_SCORED_PEOPLE } from "../utils/healthScore";
import { daysSinceLastContact, weekStats } from "../utils/stats";
import { nextReminderISO } from "../utils/peopleFilters";
import { addDays, parseISODate, toISODate } from "../utils/dates";
import { colors } from "../theme/colors";
import { locale, t, tv } from "../i18n";

type Props = {
  contacts: ContactForm[];
  threshold: number;
  weeklyGoal: number;
  onOpenPerson: (c: ContactForm) => void;
  onOpenHealthInfo: () => void;
};

const MAX_TIMELINE = 5;

/**
 * İçgörüler on Profile. The weekly goal is the main visual; the rest is kept
 * light. Each number appears once: the goal card owns "people this week" and
 * "moments this week", the timeline owns who is due.
 */
export default function ProfileInsights({ contacts, threshold, weeklyGoal, onOpenPerson, onOpenHealthInfo }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const today = toISODate(now);
    const end = toISODate(addDays(now, 7));

    // Distinct people this week (several moments with one person count once).
    const week = weekStats(contacts, weeklyGoal, now);

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
    const mix = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    const strong = contacts
      .map((c) => ({ c, d: daysSinceLastContact(c, now) }))
      .filter((x): x is { c: ContactForm; d: number } => x.d !== null && x.d <= 7)
      .sort((a, b) => a.d - b.d);

    return { week, upcoming, mix, strong, status: connectionStatus(contacts, threshold) };
  }, [contacts, threshold, weeklyGoal]);

  const { week, upcoming, mix, strong, status } = data;
  const pct = Math.min(1, week.people / week.goal);
  const maxMix = mix[0]?.[1] ?? 1;

  return (
    <View style={styles.wrap}>
      {/* ── Weekly goal: the main visual ── */}
      <View style={styles.goalCard}>
        <View style={styles.goalHead}>
          <Text style={styles.goalTitle}>{t("Haftalık hedef")}</Text>
          <Text style={styles.goalValue}>{t("{done} / {goal} kişi", { done: week.people, goal: week.goal })}</Text>
        </View>
        <View
          style={styles.goalTrack}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("Haftalık hedef: {done} / {goal} kişi", { done: week.people, goal: week.goal })}
          accessibilityValue={{ min: 0, max: week.goal, now: Math.min(week.people, week.goal) }}
        >
          <View style={[styles.goalFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={styles.goalSub}>
          {week.reached
            ? t("Bu haftanın hedefine ulaştın.")
            : t("Hedefe {count} kişi kaldı · bu hafta {moments} görüşme kaydı", { count: week.goal - week.people, moments: week.moments })}
        </Text>
      </View>

      {/* ── Upcoming catch-ups ── */}
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

      {/* ── Distribution ── */}
      <Text style={styles.title} accessibilityRole="header">{t("Bağlantı dağılımı")}</Text>
      {mix.length === 1 ? (
        <Text style={styles.line}>{t("{circle} · {count} kişi", { circle: tv(mix[0][0]), count: mix[0][1] })}</Text>
      ) : (
        <View style={styles.bars}>
          {mix.map(([label, count]) => (
            <View key={label} style={styles.barRow} accessible accessibilityLabel={t("{circle}: {count} kişi", { circle: tv(label), count })}>
              <Text style={styles.barLabel} numberOfLines={1}>{tv(label)}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max(6, Math.round((count / maxMix) * 100))}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Follow-up status: one line, with the number only when there is enough data ── */}
      <TouchableOpacity style={styles.statusRow} onPress={onOpenHealthInfo} accessibilityRole="button" accessibilityHint={t("Nasıl hesaplandığını gösterir")}>
        <Text style={styles.statusTitle}>{t("Bağlarının durumu")}</Text>
        {status.score === null ? (
          <Text style={styles.statusValueMuted}>
            {t("Henüz yeterli veri yok ({count}/{min} kişi)", { count: status.scored, min: MIN_SCORED_PEOPLE })}
          </Text>
        ) : (
          <Text style={[styles.statusValue, { color: healthScoreColor(status.score) }]}>
            {`${t(healthScoreLabel(status.score))} · ${status.score}/100`}
          </Text>
        )}
        <Ionicons name="information-circle-outline" size={18} color={colors.textSub} />
      </TouchableOpacity>

      {/* ── Strong connections: only when there are any ── */}
      {strong.length > 0 ? (
        <>
          <Text style={styles.title} accessibilityRole="header">{t("Güçlü bağlantılar")}</Text>
          <Text style={styles.line}>{t("Son 7 günde görüştüğün kişiler")}</Text>
          <View style={styles.strongRow}>
            {strong.slice(0, 6).map(({ c, d }) => (
              <TouchableOpacity
                key={c.id ?? c.fullName}
                style={styles.strongItem}
                onPress={() => onOpenPerson(c)}
                accessibilityRole="button"
                accessibilityLabel={`${c.fullName}, ${d === 0 ? t("Bugün") : t("{days} gün önce", { days: d })}`}
              >
                <Avatar name={c.fullName} avatarId={c.avatarId} size={40} />
                <Text style={styles.strongName} numberOfLines={1}>{c.fullName.split(" ")[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
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

  goalCard: { ...card, padding: 16, gap: 10 },
  goalHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  goalTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.text },
  goalValue: { fontSize: 20, lineHeight: 26, fontWeight: "600", color: colors.primary, fontVariant: ["tabular-nums"] },
  goalTrack: { height: 12, borderRadius: 6, backgroundColor: colors.borderLight, overflow: "hidden" },
  goalFill: { height: 12, borderRadius: 6, backgroundColor: colors.primary },
  goalSub: { fontSize: 13, lineHeight: 18, color: colors.textSub },

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

  bars: { ...card, padding: 12, gap: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barLabel: { width: 96, fontSize: 13, lineHeight: 18, color: colors.text },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.borderLight, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  barCount: { width: 24, textAlign: "right", fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },

  statusRow: { ...card, marginTop: 16, minHeight: 48, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  statusTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.text },
  statusValue: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600", textAlign: "right" },
  statusValueMuted: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSub, textAlign: "right" },

  strongRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  strongItem: { width: 56, minHeight: 48, alignItems: "center", gap: 4 },
  strongName: { fontSize: 12, lineHeight: 16, color: colors.text },
});
