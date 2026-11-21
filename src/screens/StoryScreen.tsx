import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Avatar from "../components/Avatar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { ContactForm } from "./AddContactScreen";
import { loadContacts } from "../data/contacts";
import { allMoments, monthlyStory } from "../utils/engagement";
import { parseISODate } from "../utils/dates";
import { showToast } from "../components/Toast";
import { colors } from "../theme/colors";
import { track } from "../utils/analytics";
import type { HostInstance } from "react-native";
import { locale, t, tv } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Story">;

function monthLabel(d: Date) {
  return d.toLocaleDateString(locale(), { month: "long", year: "numeric" });
}

const HERO = 220;
const DOTS = ["#5EEAD4", "#A78BFA", "#FDE68A", "#F9A8D4", "#93C5FD", "#86EFAC"];
/** Fixed star positions (percent) so the card looks the same every time. */
const STARS = [
  { x: 8, y: 6, r: 2, o: 0.7 }, { x: 22, y: 14, r: 1.5, o: 0.5 }, { x: 78, y: 5, r: 2, o: 0.8 }, { x: 90, y: 18, r: 1.5, o: 0.5 },
  { x: 64, y: 12, r: 1, o: 0.6 }, { x: 12, y: 40, r: 1.5, o: 0.4 }, { x: 92, y: 44, r: 2, o: 0.6 }, { x: 6, y: 70, r: 1, o: 0.5 },
  { x: 88, y: 76, r: 1.5, o: 0.5 }, { x: 46, y: 3, r: 1.5, o: 0.6 }, { x: 34, y: 90, r: 1, o: 0.4 }, { x: 72, y: 92, r: 1.5, o: 0.5 },
];

/** People met in the month and moments per week of the month (weeks 1–5). */
function monthDetails(contacts: ContactForm[], month: Date) {
  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const ids = new Set<string>();
  const weeks = [0, 0, 0, 0, 0];
  for (const m of allMoments(contacts)) {
    if (!m.date.startsWith(key)) continue;
    ids.add(m.contactId);
    const d = parseISODate(m.date);
    if (d) weeks[Math.min(4, Math.floor((d.getDate() - 1) / 7))] += 1;
  }
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return { people: contacts.filter((c) => c.id && ids.has(c.id)), weeks: daysInMonth > 28 ? weeks : weeks.slice(0, 4) };
}

/** Monthly "Wrapped"-style story card the user can share. Names are hidden unless enabled. */
export default function StoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [offset, setOffset] = useState(0);
  const [showNames, setShowNames] = useState(false);
  const cardRef = useRef<HostInstance>(null);

  useEffect(() => {
    loadContacts().then(setContacts);
  }, []);

  const month = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - offset, 15);
  }, [offset]);
  const story = useMemo(() => monthlyStory(contacts, month), [contacts, month]);
  const extra = useMemo(() => monthDetails(contacts, month), [contacts, month]);

  const headline =
    story.people === 0
      ? t("Bu ay henüz bir an kaydedilmedi")
      : t("Bu ay {count} kişiyle bağ kurdun", { count: story.people });
  const monthName = month.toLocaleDateString(locale(), { month: "long" });

  const share = async () => {
    track("story_shared", { names: showNames });
    const text = `${monthLabel(month)} — ${headline}. #Connectly`;
    try {
      if (Platform.OS !== "web" && cardRef.current) {
        const { captureRef } = require("react-native-view-shot") as typeof import("react-native-view-shot");
        const Sharing = require("expo-sharing") as typeof import("expo-sharing");
        const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: t("Hikâyeni paylaş") });
          return;
        }
      }
      await Share.share({ message: text });
    } catch {
      showToast(t("Paylaşım başlatılamadı"));
    }
  };

  const stats: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }[] = [
    { icon: "chatbubbles", value: story.moments, label: t("an") },
    { icon: "refresh-circle", value: story.reconnected, label: t("yeniden bağlantı") },
    { icon: "people", value: story.inPerson, label: t("yüz yüze buluşma") },
    { icon: "person-add", value: story.newPeople, label: t("yeni kişi") },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
          <Ionicons name="close" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => setOffset((o) => Math.min(11, o + 1))}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t("Önceki ay")}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.month}>{monthLabel(month)}</Text>
          <TouchableOpacity
            onPress={() => setOffset((o) => Math.max(0, o - 1))}
            style={[styles.iconBtn, offset === 0 && { opacity: 0.3 }]}
            disabled={offset === 0}
            accessibilityRole="button"
            accessibilityLabel={t("Sonraki ay")}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 14 }} showsVerticalScrollIndicator={false}>
      <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
        <LinearGradient colors={["#0A1230", "#12245A", "#0E5E63"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          {/* Soft aurora and a few stars: decoration only. */}
          <View style={[styles.aurora, styles.auroraA]} />
          <View style={[styles.aurora, styles.auroraB]} />
          {STARS.map((st, i) => (
            <View key={i} style={[styles.star, { left: `${st.x}%`, top: `${st.y}%`, width: st.r, height: st.r, opacity: st.o }]} />
          ))}

          <View style={styles.cardTop}>
            <View style={styles.kickerRow}>
              <Ionicons name="sparkles" size={14} color="#A7F3D0" />
              <Text style={styles.kicker}>{t("Bağlantı hikâyen")}</Text>
            </View>
            <Text style={styles.monthBig}>{monthName}</Text>
          </View>

          {/* Hero: people met this month, with them around the ring. */}
          <View style={styles.hero}>
            <Svg width={HERO} height={HERO} style={StyleSheet.absoluteFill}>
              <Circle cx={HERO / 2} cy={HERO / 2} r={HERO / 2 - 18} stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} fill="none" strokeDasharray="2 6" />
              <Circle cx={HERO / 2} cy={HERO / 2} r={HERO / 2 - 48} stroke="rgba(167,243,208,0.35)" strokeWidth={1} fill="rgba(255,255,255,0.05)" />
            </Svg>
            {extra.people.slice(0, 8).map((c, i, arr) => {
              const a = (i / Math.max(arr.length, 1)) * Math.PI * 2 - Math.PI / 2;
              const r = HERO / 2 - 18;
              const size = 34;
              return (
                <View key={c.id ?? i} style={[styles.orbiter, { left: HERO / 2 + Math.cos(a) * r - size / 2, top: HERO / 2 + Math.sin(a) * r - size / 2 }]}>
                  {showNames ? <Avatar name={c.fullName} avatarId={c.avatarId} size={size} /> : <View style={[styles.dot, { backgroundColor: DOTS[i % DOTS.length] }]} />}
                </View>
              );
            })}
            <View style={styles.heroCenter} accessible accessibilityRole="header" accessibilityLabel={headline}>
              {story.people > 0 ? (
                <>
                  <Text style={styles.heroValue}>{story.people}</Text>
                  <Text style={styles.heroLabel}>{t("kişiyle bağ kurdun")}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="leaf-outline" size={34} color="#A7F3D0" />
                  <Text style={[styles.heroLabel, { marginTop: 6 }]}>{t("Hikâyen bu ay yeni başlıyor")}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.grid}>
            {stats.map((s) => (
              <View key={s.label} style={styles.stat} accessible accessibilityLabel={`${s.value} ${s.label}`}>
                <View style={styles.statIcon}><Ionicons name={s.icon} size={16} color="#A7F3D0" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={2}>{s.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* The month's rhythm, week by week. */}
          <View style={styles.rhythm} accessible accessibilityLabel={t("Ayın ritmi: {list}", { list: extra.weeks.join(", ") })}>
            <Text style={styles.rhythmTitle}>{t("Ayın ritmi")}</Text>
            <View style={styles.bars}>
              {extra.weeks.map((n, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={[styles.bar, { height: 6 + Math.round((n / Math.max(1, ...extra.weeks)) * 34), opacity: n ? 1 : 0.35 }]} />
                  <Text style={styles.barLabel}>{t("{n}. hf", { n: i + 1 })}</Text>
                </View>
              ))}
            </View>
          </View>

          {story.topCircle || (showNames && story.topPerson) ? (
            <View style={styles.highlights}>
              {story.topCircle ? (
                <View style={styles.chip}>
                  <Ionicons name="people" size={13} color="#FDE68A" />
                  <Text style={styles.chipText}>{t("En çok vakit ayırdığın çevre: {circle}", { circle: tv(story.topCircle) })}</Text>
                </View>
              ) : null}
              {showNames && story.topPerson ? (
                <View style={styles.chip}>
                  <Ionicons name="heart" size={13} color="#FBCFE8" />
                  <Text style={styles.chipText}>{t("En çok konuştuğun kişi: {name}", { name: story.topPerson.fullName })}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.brand}>
            <Ionicons name="planet-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.brandName}>{t("Connectly")}</Text>
            <Text style={styles.brandMonth}>{monthLabel(month)}</Text>
          </View>
        </LinearGradient>
      </View>
      </ScrollView>

      <View style={styles.privacyRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <Ionicons name={showNames ? "eye-outline" : "eye-off-outline"} size={18} color="rgba(255,255,255,0.8)" />
          <Text style={styles.privacyText}>{t("İsimleri göster")}</Text>
        </View>
        <Switch
          value={showNames}
          onValueChange={setShowNames}
          trackColor={{ false: "rgba(255,255,255,0.3)", true: "#14B8A6" }}
          thumbColor={colors.white}
          accessibilityLabel={t("İsimleri göster")}
        />
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={share} accessibilityRole="button">
        <Ionicons name="share-social" size={20} color="#0A1230" />
        <Text style={styles.shareText}>{t("Hikâyeni paylaş")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#060A1A", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  monthNav: { flexDirection: "row", alignItems: "center" },
  month: { color: colors.white, fontSize: 16, fontWeight: "800", textTransform: "capitalize", minWidth: 120, textAlign: "center" },
  cardWrap: { borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  card: { paddingHorizontal: 22, paddingVertical: 20, gap: 14, minHeight: 560 },
  aurora: { position: "absolute", borderRadius: 999 },
  auroraA: { width: 320, height: 320, right: -140, top: -120, backgroundColor: "rgba(94,234,212,0.18)" },
  auroraB: { width: 280, height: 280, left: -140, bottom: -90, backgroundColor: "rgba(167,139,250,0.20)" },
  star: { position: "absolute", borderRadius: 2, backgroundColor: "#FFFFFF" },
  cardTop: { gap: 2 },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kicker: { color: "#A7F3D0", fontSize: 12, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase" },
  monthBig: { color: "#FFFFFF", fontSize: 34, lineHeight: 40, fontWeight: "800", textTransform: "capitalize" },
  hero: { width: HERO, height: HERO, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  orbiter: { position: "absolute", width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, borderWidth: 2, borderColor: "rgba(255,255,255,0.7)", overflow: "hidden" },
  dot: { width: 30, height: 30, borderRadius: 15 },
  heroCenter: { alignItems: "center", maxWidth: HERO - 110 },
  heroValue: { color: "#FFFFFF", fontSize: 56, lineHeight: 62, fontWeight: "800" },
  heroLabel: { color: "rgba(255,255,255,0.88)", fontSize: 14, lineHeight: 19, fontWeight: "600", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  statIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(167,243,208,0.14)" },
  statValue: { color: "#FFFFFF", fontSize: 22, lineHeight: 26, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  rhythm: { gap: 8 },
  rhythmTitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 10, height: 58 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "70%", borderRadius: 6, backgroundColor: "#5EEAD4" },
  barLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "600" },
  highlights: { gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" },
  chipText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  brand: { marginTop: "auto", paddingTop: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", flex: 1 },
  brandMonth: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  privacyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, marginTop: 4 },
  privacyText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  shareBtn: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareText: { color: "#0A1230", fontSize: 16, fontWeight: "800" },
});
