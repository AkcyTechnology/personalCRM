import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { ContactForm, InteractionType } from "./AddContactScreen";
import { loadContacts, snoozeContact } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import { reachOutCandidates, reasonFor, type PickReason } from "../utils/engagement";
import { addDays, toISODate } from "../utils/dates";
import { openPhoneCall } from "../utils/links";
import { logMoment } from "../app/momentActions";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import LogInteractionModal from "../components/LogInteractionModal";
import MessageComposer from "../components/MessageComposer";
import { showToast } from "../components/Toast";
import { hapticTap } from "../utils/haptics";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { track } from "../utils/analytics";
import { t, tv } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Shuffle">;

export function reasonText(r: PickReason, name: string): string {
  switch (r.kind) {
    case "birthday":
      return r.days === 0 ? t("Bugün {name}'in doğum günü 🎂", { name }) : t("{days} gün sonra doğum günü 🎂", { days: r.days });
    case "longTime":
      return t("{days} gündür konuşmadınız", { days: r.days });
    case "noted":
      return t("Son konuştuğunuz şeyi sormaya ne dersin?");
    case "newConnection":
      return t("Yeni bağlantın — ilk mesajı at");
    default:
      return t("Küçük bir merhaba çok şey değiştirebilir");
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export default function ShuffleScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [deck, setDeck] = useState<ContactForm[] | null>(null);
  const [index, setIndex] = useState(0);
  const [composer, setComposer] = useState<ContactForm | null>(null);
  const [logTarget, setLogTarget] = useState<{ contact: ContactForm; type: InteractionType } | null>(null);
  const pending = useRef<{ contact: ContactForm; type: InteractionType } | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const crossed = useRef(false);
  const move = useMemo(() => Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }), [pan]);

  useEffect(() => {
    Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
      setDeck(reachOutCandidates(c, s.reachOutThresholdDays || 14).slice(0, 15));
    });
  }, []);

  // WhatsApp / aramadan dönünce "Görüştün mü?" diye sor — otomatik kayıt yok.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && pending.current) {
        const p = pending.current;
        pending.current = null;
        setTimeout(() => setLogTarget(p), 400);
      }
    });
    return () => sub.remove();
  }, []);

  const current = deck?.[index];
  const next = deck?.[index + 1];

  const advance = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    setIndex((i) => i + 1);
  }, [pan]);

  const flyOut = useCallback(
    (dir: "left" | "right" | "up", after: () => void) => {
      hapticTap();
      track("shuffle_swipe", { dir });
      const to = dir === "left" ? { x: -width * 1.4, y: 0 } : dir === "right" ? { x: width * 1.4, y: 0 } : { x: 0, y: -900 };
      Animated.timing(pan, { toValue: to, duration: 220, useNativeDriver: true }).start(() => {
        after();
        advance();
      });
    },
    [advance, pan, width]
  );

  const skip = useCallback(() => flyOut("left", () => {}), [flyOut]);

  const remindLater = useCallback(() => {
    const c = current;
    if (!c?.id) return;
    flyOut("up", async () => {
      await snoozeContact(c.id!, toISODate(addDays(new Date(), 3)));
      showToast(t("{name} için 3 gün sonra hatırlatacağım", { name: firstName(c.fullName) }));
    });
  }, [current, flyOut]);

  const reachOut = useCallback(() => {
    const c = current;
    if (!c) return;
    flyOut("right", () => setComposer(c));
  }, [current, flyOut]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
        onPanResponderGrant: () => { crossed.current = false; },
        onPanResponderMove: (e, g) => {
          // One tick when the card crosses the decision threshold, so the user feels it "lock in".
          const over = Math.abs(g.dx) > 110 || g.dy < -110;
          if (over !== crossed.current) {
            crossed.current = over;
            if (over) hapticTap();
          }
          move(e, g);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx > 110) reachOut();
          else if (g.dx < -110) skip();
          else if (g.dy < -110) remindLater();
          else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
        },
      }),
    [move, pan, reachOut, remindLater, skip]
  );

  const rotate = pan.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ["-12deg", "0deg", "12deg"] });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: "clamp" });
  const skipOpacity = pan.x.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t("Kapat")}
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">{t("Bugün kimi hatırlayalım?")}</Text>
        <View style={styles.headerBtn} />
      </View>

      {deck === null ? null : !current ? (
        <EmptyState
          icon="sparkles-outline"
          title={t("Hepsi bu kadar ✨")}
          description={t("Bugünlük harika gidiyorsun.")}
          buttonLabel={t("Ana sayfaya dön")}
          onPress={() => navigation.goBack()}
        />
      ) : (
        <>
          <View style={styles.deck}>
            {next ? (
              <View style={[styles.card, styles.cardBehind]} importantForAccessibility="no-hide-descendants">
                <CardBody contact={next} />
              </View>
            ) : null}
            <Animated.View
              {...responder.panHandlers}
              style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
              accessible
              accessibilityLabel={`${current.fullName}. ${reasonText(reasonFor(current), firstName(current.fullName))}`}
              accessibilityHint={t("Sağa kaydır: ulaş. Sola kaydır: geç. Yukarı kaydır: sonra hatırlat.")}
            >
              <CardBody contact={current} />
              <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
                <Text style={[styles.stampText, { color: colors.primary }]}>{t("ULAŞ")}</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: skipOpacity }]}>
                <Text style={[styles.stampText, { color: colors.textSub }]}>{t("GEÇ")}</Text>
              </Animated.View>
            </Animated.View>
          </View>

          <Text style={styles.counter}>{t("{current} / {total}", { current: index + 1, total: deck.length })}</Text>

          <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
            <RoundButton icon="close" color={colors.textSub} label={t("Şimdilik geç")} onPress={skip} />
            <RoundButton icon="alarm-outline" color={colors.warning} label={t("Bu hafta hatırlat")} onPress={remindLater} />
            <RoundButton icon="chatbubble-ellipses" color={colors.onFill} bg={colors.primary} big label={t("Ulaş")} onPress={reachOut} />
          </View>
        </>
      )}

      <MessageComposer
        visible={!!composer}
        contact={composer}
        onClose={() => setComposer(null)}
        onExternalSend={() => { if (composer) pending.current = { contact: composer, type: "whatsapp" }; }}
        extraActions={
          composer?.phone
            ? [
                {
                  label: t("Ara"),
                  onPress: () => {
                    const c = composer;
                    setComposer(null);
                    pending.current = { contact: c, type: "call" };
                    openPhoneCall(c.phone);
                  },
                },
              ]
            : []
        }
      />

      <LogInteractionModal
        visible={!!logTarget}
        contactName={logTarget?.contact.fullName ?? ""}
        initialType={logTarget?.type}
        onClose={() => setLogTarget(null)}
        onSave={(type, note, date) => {
          const target = logTarget;
          setLogTarget(null);
          if (target) logMoment(target.contact, type, note, date);
        }}
      />
    </View>
  );
}

function CardBody({ contact }: { contact: ContactForm }) {
  const reason = reasonFor(contact);
  const lastNote = [...(contact.interactions ?? [])].filter((i) => i.note).sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <LinearGradient colors={[colors.primarySoft, colors.surface]} style={styles.cardInner}>
      <Avatar name={contact.fullName} size={120} ringColor={colors.brand} />
      <Text style={styles.name} numberOfLines={1}>{contact.fullName}</Text>
      {contact.relationship ? <Text style={styles.relation}>{tv(contact.relationship)}</Text> : null}
      <View style={styles.reason}>
        <Ionicons name="sparkles" size={16} color={colors.accent} />
        <Text style={styles.reasonText}>{reasonText(reason, firstName(contact.fullName))}</Text>
      </View>
      {lastNote ? (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>{t("Son konuştuğunuzda")}</Text>
          <Text style={styles.noteText} numberOfLines={3}>“{lastNote.note}”</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function RoundButton({
  icon, color, bg, big, label, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg?: string;
  big?: boolean;
  label: string;
  onPress: () => void;
}) {
  const size = big ? 76 : 60;
  return (
    <View style={styles.roundWrap}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? colors.surface }]}
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={0.8}
      >
        <Ionicons name={icon} size={big ? 32 : 26} color={color} />
      </TouchableOpacity>
      <Text style={styles.roundLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.text },
  deck: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  card: {
    position: "absolute",
    width: "88%",
    maxWidth: 380,
    aspectRatio: 0.72,
    borderRadius: 28,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardBehind: { transform: [{ scale: 0.94 }, { translateY: 18 }], opacity: 0.7 },
  cardInner: { flex: 1, borderRadius: 28, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  name: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: 12 },
  relation: { fontSize: 16, color: colors.textSub, fontWeight: "600" },
  reason: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  reasonText: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
  note: { marginTop: 12, alignSelf: "stretch", padding: 14, borderRadius: 16, backgroundColor: colors.card },
  noteLabel: { fontSize: 13, fontWeight: "700", color: colors.textSub, marginBottom: 4 },
  noteText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  stamp: { position: "absolute", top: 28, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 3 },
  stampLike: { left: 24, borderColor: colors.primary, transform: [{ rotate: "-12deg" }] },
  stampSkip: { right: 24, borderColor: colors.textSub, transform: [{ rotate: "12deg" }] },
  stampText: { fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  counter: { textAlign: "center", color: colors.textSub, fontWeight: "700", marginBottom: 12 },
  actions: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 28 },
  roundWrap: { alignItems: "center", gap: 6, width: 84 },
  round: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  roundLabel: { fontSize: 13, fontWeight: "700", color: colors.textSub, textAlign: "center" },
});
