import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { ContactForm } from "./AddContactScreen";
import { loadContacts } from "../data/contacts";
import { monthlyStory } from "../utils/engagement";
import { showToast } from "../components/Toast";
import { colors } from "../theme/colors";
import { track } from "../utils/analytics";
import { locale, t, tv } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Story">;

function monthLabel(d: Date) {
  return d.toLocaleDateString(locale(), { month: "long", year: "numeric" });
}

/** Monthly "Wrapped"-style story card the user can share. Names are hidden unless enabled. */
export default function StoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [offset, setOffset] = useState(0);
  const [showNames, setShowNames] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    loadContacts().then(setContacts);
  }, []);

  const month = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - offset, 15);
  }, [offset]);
  const story = useMemo(() => monthlyStory(contacts, month), [contacts, month]);

  const headline =
    story.people === 0
      ? t("Bu ay henüz bir an kaydedilmedi")
      : t("Bu ay {count} kişiyle bağ kurdun", { count: story.people });

  const share = async () => {
    track("story_shared", { names: showNames });
    const text = `${monthLabel(month)} — ${headline}. ${t("Life happens between people.")} #Connectly`;
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

      <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
        <LinearGradient colors={["#0F766E", "#5B21B6", "#E8604A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <Text style={styles.kicker}>{t("Bağlantı hikâyen")}</Text>
          <Text style={styles.headline} accessibilityRole="header">{headline}</Text>

          <View style={styles.grid}>
            {stats.map((s) => (
              <View key={s.label} style={styles.stat} accessible accessibilityLabel={`${s.value} ${s.label}`}>
                <Ionicons name={s.icon} size={22} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {story.topCircle ? (
            <Text style={styles.line}>{t("En çok vakit ayırdığın çevre: {circle}", { circle: tv(story.topCircle) })}</Text>
          ) : null}
          {showNames && story.topPerson ? (
            <Text style={styles.line}>{t("En çok konuştuğun kişi: {name}", { name: story.topPerson.fullName })}</Text>
          ) : null}

          <View style={styles.brand}>
            <Text style={styles.brandName}>{t("Connectly")}</Text>
            <Text style={styles.tagline}>{t("Life happens between people.")}</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.privacyRow}>
        <Text style={styles.privacyText}>{t("İsimleri göster")}</Text>
        <Switch
          value={showNames}
          onValueChange={setShowNames}
          trackColor={{ false: "rgba(255,255,255,0.3)", true: colors.brand }}
          thumbColor={colors.white}
          accessibilityLabel={t("İsimleri göster")}
        />
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={share} accessibilityRole="button">
        <Ionicons name="share-social" size={20} color={colors.text} />
        <Text style={styles.shareText}>{t("Hikâyeni paylaş")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#111827", paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  monthNav: { flexDirection: "row", alignItems: "center" },
  month: { color: colors.white, fontSize: 16, fontWeight: "800", textTransform: "capitalize", minWidth: 120, textAlign: "center" },
  cardWrap: { flex: 1, marginVertical: 16, borderRadius: 28, overflow: "hidden" },
  card: { flex: 1, padding: 28, justifyContent: "center" },
  kicker: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  headline: { color: colors.white, fontSize: 32, fontWeight: "900", marginTop: 10, lineHeight: 38 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 28 },
  stat: { width: "47%", padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", gap: 2 },
  statValue: { color: colors.white, fontSize: 30, fontWeight: "900", marginTop: 4 },
  statLabel: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600" },
  line: { color: colors.white, fontSize: 16, fontWeight: "700", marginTop: 18 },
  brand: { marginTop: "auto", paddingTop: 24 },
  brandName: { color: colors.white, fontSize: 20, fontWeight: "900" },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600", marginTop: 2 },
  privacyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
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
  shareText: { color: colors.text, fontSize: 16, fontWeight: "800" },
});
