import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Circle as SvgCircle } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ContactForm } from "./AddContactScreen";
import { loadContacts, subscribeContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import { healthScore, healthScoreColor } from "../utils/healthScore";
import { daysSinceIntervalStart, isDue } from "../utils/reminderInterval";
import { logMoment } from "../app/momentActions";
import Avatar, { initials } from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import LogInteractionModal from "../components/LogInteractionModal";
import InsightsScreen from "./InsightsScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { consumeGlow } from "../app/glow";
import { t, tv } from "../i18n";

const CLUSTER_COLORS = [colors.primary, colors.warm, colors.accent, colors.secondary, colors.warning, colors.success, colors.primaryDark, colors.warmStrong];
const MAX_CLUSTERS = 7;
const OTHER = "Diğer";

type Node = { contact: ContactForm; x: number; y: number; size: number; score: number; due: boolean; cluster: number };
type Hub = { label: string; x: number; y: number; color: string; count: number };

/** Deterministic radial layout: you in the centre, one cluster per relationship type. */
function layout(contacts: ContactForm[], threshold: number, w: number, h: number) {
  const groups = new Map<string, ContactForm[]>();
  for (const c of contacts) {
    const key = c.relationship || OTHER;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  let entries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  if (entries.length > MAX_CLUSTERS) {
    const rest = entries.slice(MAX_CLUSTERS - 1).flatMap(([, list]) => list);
    entries = [...entries.slice(0, MAX_CLUSTERS - 1), [OTHER, rest]];
  }

  const cx = w / 2, cy = h / 2;
  const hubRadius = Math.min(w, h) * (entries.length === 1 ? 0 : 0.3);
  const size = contacts.length > 60 ? 26 : contacts.length > 30 ? 32 : 40;
  const hubs: Hub[] = [];
  const nodes: Node[] = [];

  entries.forEach(([label, list], gi) => {
    const angle = (2 * Math.PI * gi) / entries.length - Math.PI / 2;
    const hx = cx + Math.cos(angle) * hubRadius;
    const hy = cy + Math.sin(angle) * hubRadius;
    const color = CLUSTER_COLORS[gi % CLUSTER_COLORS.length];
    hubs.push({ label, x: hx, y: hy, color, count: list.length });

    // Yakın (sağlıklı) ilişkiler küme merkezine yakın, zayıflayanlar dışarıda.
    const sorted = [...list].sort((a, b) => healthScore(b, threshold) - healthScore(a, threshold));
    sorted.forEach((c, k) => {
      const a = angle + k * 2.39996; // altın açı
      const dist = 34 + size * 0.55 * Math.sqrt(k + 1);
      const x = Math.max(size / 2 + 4, Math.min(w - size / 2 - 4, hx + Math.cos(a) * dist));
      const y = Math.max(size / 2 + 4, Math.min(h - size / 2 - 4, hy + Math.sin(a) * dist));
      const score = c.reminderEnabled === false ? 100 : healthScore(c, threshold);
      nodes.push({ contact: c, x, y, size, score, due: isDue(c, threshold), cluster: gi });
    });
  });
  return { hubs, nodes, cx, cy };
}

export default function UniverseScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<"universe" | "story">("universe");

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title} accessibilityRole="header">{t("Evrenin")}</Text>
        <TouchableOpacity
          style={styles.storyBtn}
          onPress={() => navigation.navigate("Story")}
          accessibilityRole="button"
          accessibilityLabel={t("Bu ayın hikâyesi")}
        >
          <Ionicons name="sparkles" size={16} color={colors.onFill} />
          <Text style={styles.storyBtnText}>{t("Bu ayın hikâyesi")}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.segment} accessibilityRole="tablist">
        {(["universe", "story"] as const).map((key) => {
          const active = view === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setView(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={key === "universe" ? "planet-outline" : "stats-chart-outline"} size={16} color={active ? colors.onFill : colors.textSub} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {key === "universe" ? t("Bağ haritası") : t("İçgörüler")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {view === "universe" ? <UniverseMap navigation={navigation} /> : <InsightsScreen navigation={navigation} embedded />}
    </View>
  );
}

function UniverseMap({ navigation }: { navigation: any }) {
  const { width, height } = useWindowDimensions();
  const [contacts, setContacts] = useState<ContactForm[] | null>(null);
  const [threshold, setThreshold] = useState(14);
  const [selected, setSelected] = useState<ContactForm | null>(null);
  const [logTarget, setLogTarget] = useState<ContactForm | null>(null);
  const [focusCluster, setFocusCluster] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [glowId, setGlowId] = useState<string | null>(null);
  const float = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
        setGlowId(consumeGlow());
      });
      return subscribeContacts((c) => {
        setContacts(c);
        const g = consumeGlow();
        if (g) setGlowId(g);
      });
    }, [])
  );

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduceMotion]);

  const canvasW = width;
  const canvasH = Math.max(380, Math.min(height * 0.58, width * 1.3));
  const map = useMemo(
    () => (contacts ? layout(contacts, threshold, canvasW, canvasH) : null),
    [contacts, threshold, canvasW, canvasH]
  );

  if (!contacts || !map) return null;

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon="planet-outline"
        title={t("Evrenin burada şekillenecek")}
        description={t("İlk kişini ekle, bağların burada canlansın.")}
        buttonLabel={t("Kişi ekle")}
        onPress={() => navigation.navigate("AddContact")}
      />
    );
  }

  const dueCount = map.nodes.filter((n) => n.due).length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <View style={{ width: canvasW, height: canvasH }}>
        <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
          {map.hubs.map((hub, i) => (
            <Line
              key={`hub-${i}`}
              x1={map.cx}
              y1={map.cy}
              x2={hub.x}
              y2={hub.y}
              stroke={hub.color}
              strokeOpacity={focusCluster === null || focusCluster === i ? 0.45 : 0.1}
              strokeWidth={3}
            />
          ))}
          {map.nodes.map((n, i) => (
            <Line
              key={`edge-${i}`}
              x1={map.hubs[n.cluster].x}
              y1={map.hubs[n.cluster].y}
              x2={n.x}
              y2={n.y}
              stroke={map.hubs[n.cluster].color}
              strokeOpacity={(focusCluster === null || focusCluster === n.cluster ? 0.35 : 0.06) * (n.score < 40 ? 0.5 : 1)}
              strokeWidth={1.5}
              strokeDasharray={n.score < 40 ? "4 4" : undefined}
            />
          ))}
          {map.hubs.map((hub, i) => (
            <SvgCircle key={`hubdot-${i}`} cx={hub.x} cy={hub.y} r={7} fill={hub.color} opacity={0.9} />
          ))}
        </Svg>

        {/* Sen */}
        <View
          style={[styles.me, { left: map.cx - 32, top: map.cy - 32 }]}
          accessible
          accessibilityLabel={t("Sen, evrenin merkezi")}
        >
          <Text style={styles.meText}>{t("Sen")}</Text>
        </View>

        {map.nodes.map((n, i) => {
          const dim = focusCluster !== null && focusCluster !== n.cluster;
          const faded = n.score < 40;
          const dy = reduceMotion
            ? 0
            : float.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 === 0 ? -4 : 4] });
          const days = daysSinceIntervalStart(n.contact);
          return (
            <Animated.View
              key={n.contact.id ?? i}
              style={[
                styles.nodeWrap,
                { left: n.x - n.size / 2, top: n.y - n.size / 2, opacity: dim ? 0.2 : faded ? 0.55 : 1, transform: [{ translateY: dy as any }] },
              ]}
            >
              {n.due && !reduceMotion ? <Pulse size={n.size} color={colors.warm} /> : null}
              {glowId && glowId === n.contact.id && !reduceMotion ? (
                <Glow key={glowId} size={n.size} onDone={() => setGlowId(null)} />
              ) : null}
              <TouchableOpacity
                onPress={() => setSelected(n.contact)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={[
                  n.contact.fullName,
                  tv(n.contact.relationship),
                  days < 9999 ? t("{days} gündür görüşülmedi", { days }) : "",
                  n.due ? t("seni özlemiş olabilir") : "",
                ].filter(Boolean).join(", ")}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View
                  style={[
                    styles.node,
                    {
                      width: n.size,
                      height: n.size,
                      borderRadius: n.size / 2,
                      borderColor: healthScoreColor(n.score),
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text style={[styles.nodeText, { fontSize: n.size * 0.34, color: map.hubs[n.cluster].color }]} allowFontScaling={false}>
                    {initials(n.contact.fullName)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Legend / cluster filter */}
      <View style={styles.legend}>
        {map.hubs.map((hub, i) => {
          const active = focusCluster === i;
          return (
            <TouchableOpacity
              key={hub.label}
              style={[styles.legendChip, active && { backgroundColor: hub.color, borderColor: hub.color }]}
              onPress={() => setFocusCluster(active ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t("{circle}: {count} kişi", { circle: tv(hub.label), count: hub.count })}
            >
              <View style={[styles.legendDot, { backgroundColor: active ? colors.onFill : hub.color }]} />
              <Text style={[styles.legendText, active && { color: colors.onFill }]}>{tv(hub.label)} · {hub.count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.hintRow}>
        <View style={styles.hintItem}><View style={[styles.hintDot, { borderColor: colors.success }]} /><Text style={styles.hintText}>{t("Güçlü bağ")}</Text></View>
        <View style={styles.hintItem}><View style={[styles.hintDot, { borderColor: colors.danger, opacity: 0.55 }]} /><Text style={styles.hintText}>{t("Soluyor")}</Text></View>
        {dueCount > 0 ? <Text style={styles.hintText}>{t("{count} kişi seni özlemiş olabilir", { count: dueCount })}</Text> : null}
      </View>

      <PersonPreview
        contact={selected}
        threshold={threshold}
        onClose={() => setSelected(null)}
        onOpen={(c) => { setSelected(null); navigation.navigate("PersonDetail", { contact: c }); }}
        onLog={(c) => { setSelected(null); setLogTarget(c); }}
      />
      <LogInteractionModal
        visible={!!logTarget}
        contactName={logTarget?.fullName ?? ""}
        onClose={() => setLogTarget(null)}
        onSave={(type, note, date) => {
          const target = logTarget;
          setLogTarget(null);
          if (target) logMoment(target, type, note, date, () => loadContacts().then(setContacts));
        }}
      />
    </ScrollView>
  );
}

/** A one-off warm glow around the star of someone you just connected with. */
function Glow({ size, onDone }: { size: number; onDone: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 2, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => done.current());
  }, [v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.warm,
        opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 0.6, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.6, 2.4] }) }],
      }}
    />
  );
}

function Pulse({ size, color }: { size: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
      }}
    />
  );
}

function PersonPreview({
  contact, threshold, onClose, onOpen, onLog,
}: {
  contact: ContactForm | null;
  threshold: number;
  onClose: () => void;
  onOpen: (c: ContactForm) => void;
  onLog: (c: ContactForm) => void;
}) {
  if (!contact) return null;
  const score = healthScore(contact, threshold);
  const days = daysSinceIntervalStart(contact);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTop}>
            <Avatar name={contact.fullName} size={64} ringColor={healthScoreColor(score)} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{contact.fullName}</Text>
              <Text style={styles.sheetSub}>
                {[tv(contact.relationship), days < 9999 ? (days === 0 ? t("Bugün görüşüldü") : t("{days} gün önce", { days })) : t("Henüz görüşme yok")]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.sheetPrimary} onPress={() => onLog(contact)} accessibilityRole="button">
            <Ionicons name="checkmark-circle" size={20} color={colors.onFill} />
            <Text style={styles.sheetPrimaryText}>{t("Görüştüm")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetSecondary} onPress={() => onOpen(contact)} accessibilityRole="button">
            <Text style={styles.sheetSecondaryText}>{t("Hikâyenizi gör")}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  storyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  storyBtnText: { color: colors.onFill, fontWeight: "800", fontSize: 14 },
  segment: { flexDirection: "row", marginHorizontal: 20, padding: 4, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  segmentBtn: { flex: 1, minHeight: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: "700", color: colors.textSub },
  segmentTextActive: { color: colors.onFill },
  me: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.inverse,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.primarySoft,
  },
  meText: { color: colors.onInverse, fontWeight: "900", fontSize: 15 },
  nodeWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  node: {
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nodeText: { fontWeight: "800" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 8 },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 14, fontWeight: "700", color: colors.text },
  hintRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16, paddingHorizontal: 20, marginTop: 14 },
  hintItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  hintText: { fontSize: 13, color: colors.textSub, fontWeight: "600" },
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  sheetTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  sheetName: { fontSize: 20, fontWeight: "800", color: colors.text },
  sheetSub: { fontSize: 14, color: colors.textSub, marginTop: 2 },
  sheetPrimary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sheetPrimaryText: { color: colors.onFill, fontSize: 16, fontWeight: "800" },
  sheetSecondary: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  sheetSecondaryText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
});
