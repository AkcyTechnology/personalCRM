import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import Svg, { Ellipse, Line } from "react-native-svg";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ContactForm } from "./AddContactScreen";
import { loadContacts, subscribeContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import { healthScore, healthScoreColor, healthSortKey } from "../utils/healthScore";
import { daysSinceIntervalStart, isDue } from "../utils/reminderInterval";
import { logMoment } from "../app/momentActions";
import Avatar from "../components/Avatar";
import LogInteractionModal from "../components/LogInteractionModal";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { SUN, SPACE_BG, SPACE_BASE, PLANET_TINT, assignPlanets, planetImage, type PlanetKey } from "../data/planets";
import { consumeGlow } from "../app/glow";
import { t, tv } from "../i18n";

const MAX_CLUSTERS = 8;
const OTHER = "Diğer";
const PLANET = 60;
const SUN_SIZE = 92;
/** Moon slots around a planet, in radians from straight up; the bottom is left for its name. */
const ARC = [0, -0.8, 0.8, -1.6, 1.6, -2.3, 2.3];

/** Text on the night sky (the map stays dark in both themes). */
const SKY = { text: "#FFFFFF", sub: "rgba(255,255,255,0.78)", line: "rgba(255,255,255,0.22)", chip: "rgba(255,255,255,0.12)", chipBorder: "rgba(255,255,255,0.24)", base: SPACE_BASE };

type Node = { contact: ContactForm; x: number; y: number; size: number; score: number | null; due: boolean; cluster: number };
type Hub = { label: string; x: number; y: number; planet: PlanetKey; color: string; count: number; orbit: number };

/** Deterministic solar layout: you are the sun, each relationship type a planet on its orbit, people as moons around it. */
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
  const planets = assignPlanets(entries.map(([label]) => label));

  const cx = w / 2, cy = h / 2;
  const base = Math.min(w, h);
  // Two orbits once there are more than four planets, so they don't crowd.
  const orbits = entries.length > 4 ? [base * 0.27, base * 0.4] : [base * 0.34];
  const size = contacts.length > 60 ? 24 : contacts.length > 30 ? 28 : 34;
  const hubs: Hub[] = [];
  const nodes: Node[] = [];
  const pad = size / 2 + 4;

  entries.forEach(([label, list], gi) => {
    const angle = (2 * Math.PI * gi) / entries.length - Math.PI / 2 + (gi % 2 ? 0.18 : 0);
    const orbit = orbits[gi % orbits.length];
    const hx = cx + Math.cos(angle) * orbit;
    const hy = cy + Math.sin(angle) * orbit * 1.05;
    hubs.push({ label, x: hx, y: hy, planet: planets[gi], color: PLANET_TINT[planets[gi]], count: list.length, orbit });

    // Moons sit on arcs above the planet (its name is below), closest bonds
    // first; a full arc starts a wider one.
    const sorted = [...list].sort((a, b) => healthSortKey(b, threshold) - healthSortKey(a, threshold));
    sorted.forEach((c, k) => {
      const ring = Math.floor(k / ARC.length);
      const a = -Math.PI / 2 + ARC[k % ARC.length] + (ring % 2 ? 0.4 : 0);
      const dist = PLANET / 2 + size / 2 + 6 + ring * (size + 6);
      const x = Math.max(pad, Math.min(w - pad, hx + Math.cos(a) * dist));
      const y = Math.max(pad, Math.min(h - pad, hy + Math.sin(a) * dist));
      const score = c.reminderEnabled === false ? 100 : healthScore(c, threshold);
      nodes.push({ contact: c, x, y, size, score, due: isDue(c, threshold), cluster: gi });
    });
  });
  return { hubs, nodes, cx, cy, orbits: [...new Set(orbits)] };
}

export default function UniverseScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  return (
    <View style={styles.screen}>
      {/* Night sky: a softly animated GIF, still when Reduce Motion is on. */}
      <Image source={SPACE_BG} style={StyleSheet.absoluteFill} contentFit="cover" autoplay={!reduceMotion} accessible={false} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title} accessibilityRole="header">{t("Evrenin")}</Text>
        <TouchableOpacity
          style={styles.storyBtn}
          onPress={() => navigation.navigate("Story")}
          accessibilityRole="button"
          accessibilityLabel={t("Bu ayın hikâyesi")}
        >
          <Ionicons name="sparkles" size={16} color={SKY.text} />
          <Text style={styles.storyBtnText}>{t("Bu ayın hikâyesi")}</Text>
        </TouchableOpacity>
      </View>
      <UniverseMap navigation={navigation} reduceMotion={reduceMotion} />
    </View>
  );
}

function UniverseMap({ navigation, reduceMotion }: { navigation: any; reduceMotion: boolean }) {
  const { width, height } = useWindowDimensions();
  const [contacts, setContacts] = useState<ContactForm[] | null>(null);
  const [threshold, setThreshold] = useState(14);
  const [selected, setSelected] = useState<ContactForm | null>(null);
  const [logTarget, setLogTarget] = useState<ContactForm | null>(null);
  const [focusCluster, setFocusCluster] = useState<number | null>(null);
  const [glowId, setGlowId] = useState<string | null>(null);
  const float = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

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
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const turn = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    turn.start();
    return () => { loop.stop(); turn.stop(); };
  }, [float, spin, reduceMotion]);

  const canvasW = width;
  const canvasH = Math.max(440, Math.min(height * 0.64, width * 1.35));
  const map = useMemo(
    () => (contacts ? layout(contacts, threshold, canvasW, canvasH) : null),
    [contacts, threshold, canvasW, canvasH]
  );

  if (!contacts || !map) return null;

  if (contacts.length === 0) {
    return (
      <View style={styles.empty}>
        <Image source={SUN} style={{ width: 120, height: 120 }} contentFit="contain" accessible={false} />
        <Text style={styles.emptyTitle}>{t("Evrenin burada şekillenecek")}</Text>
        <Text style={styles.emptyText}>{t("İlk kişini ekle, bağların burada canlansın.")}</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate("AddContact")} accessibilityRole="button">
          <Ionicons name="add" size={18} color={SKY.base} />
          <Text style={styles.emptyBtnText}>{t("Kişi ekle")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dueCount = map.nodes.filter((n) => n.due).length;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <View style={{ width: canvasW, height: canvasH }}>
        <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
          {map.orbits.map((r) => (
            <Ellipse key={`orbit-${r}`} cx={map.cx} cy={map.cy} rx={r} ry={r * 1.05} stroke={SKY.line} strokeWidth={1} strokeDasharray="3 6" fill="none" />
          ))}
          {map.nodes.map((n, i) => (
            <Line
              key={`edge-${i}`}
              x1={map.hubs[n.cluster].x}
              y1={map.hubs[n.cluster].y}
              x2={n.x}
              y2={n.y}
              stroke={map.hubs[n.cluster].color}
              strokeOpacity={(focusCluster === null || focusCluster === n.cluster ? 0.5 : 0.08) * (n.score !== null && n.score < 40 ? 0.5 : 1)}
              strokeWidth={1}
              strokeDasharray={n.score !== null && n.score < 40 ? "3 4" : undefined}
            />
          ))}
        </Svg>

        {/* You: the sun */}
        <View style={[styles.sunWrap, { left: map.cx - SUN_SIZE / 2, top: map.cy - SUN_SIZE / 2 }]} accessible accessibilityLabel={t("Sen, evrenin merkezi")}>
          <Animated.View style={{ width: SUN_SIZE, height: SUN_SIZE, transform: [{ rotate }] }}>
            <Image source={SUN} style={{ width: SUN_SIZE, height: SUN_SIZE }} contentFit="contain" />
          </Animated.View>
          <Text style={styles.sunLabel}>{t("Sen")}</Text>
        </View>

        {/* Planets: one per relationship type */}
        {map.hubs.map((hub, i) => {
          const active = focusCluster === i;
          const dim = focusCluster !== null && !active;
          const dy = reduceMotion ? 0 : float.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 ? 3 : -3] });
          return (
            <Animated.View
              key={`planet-${hub.label}`}
              style={[styles.planetWrap, { left: hub.x - PLANET / 2 - 20, top: hub.y - PLANET / 2, opacity: dim ? 0.35 : 1, transform: [{ translateY: dy as any }] }]}
            >
              <TouchableOpacity
                onPress={() => setFocusCluster(active ? null : i)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t("{circle} gezegeni: {count} kişi", { circle: tv(hub.label), count: hub.count })}
                style={styles.planetHit}
              >
                <Image source={planetImage(hub.planet)} style={{ width: PLANET, height: PLANET }} contentFit="contain" />
                <Text style={[styles.planetLabel, active && { color: hub.color }]} numberOfLines={1}>{tv(hub.label)}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* People: moons around their planet */}
        {map.nodes.map((n, i) => {
          const dim = focusCluster !== null && focusCluster !== n.cluster;
          const faded = n.score !== null && n.score < 40;
          const dy = reduceMotion
            ? 0
            : float.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 === 0 ? -4 : 4] });
          const days = daysSinceIntervalStart(n.contact);
          return (
            <Animated.View
              key={n.contact.id ?? i}
              style={[
                styles.nodeWrap,
                { left: n.x - n.size / 2, top: n.y - n.size / 2, opacity: dim ? 0.2 : faded ? 0.6 : 1, transform: [{ translateY: dy as any }] },
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
                hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
              >
                <Avatar name={n.contact.fullName} avatarId={n.contact.avatarId} size={n.size} ringColor={healthScoreColor(n.score)} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Legend / planet filter */}
      <View style={styles.legend}>
        {map.hubs.map((hub, i) => {
          const active = focusCluster === i;
          return (
            <TouchableOpacity
              key={hub.label}
              style={[styles.legendChip, active && { borderColor: hub.color, backgroundColor: "rgba(255,255,255,0.22)" }]}
              onPress={() => setFocusCluster(active ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t("{circle}: {count} kişi", { circle: tv(hub.label), count: hub.count })}
            >
              <Image source={planetImage(hub.planet)} style={{ width: 20, height: 20 }} contentFit="contain" />
              <Text style={styles.legendText}>{tv(hub.label)} · {hub.count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.hintRow}>
        <View style={styles.hintItem}><View style={[styles.hintDot, { borderColor: colors.success }]} /><Text style={styles.hintText}>{t("Güçlü bağ")}</Text></View>
        <View style={styles.hintItem}><View style={[styles.hintDot, { borderColor: colors.danger, opacity: 0.6 }]} /><Text style={styles.hintText}>{t("Soluyor")}</Text></View>
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
            <Avatar name={contact.fullName} avatarId={contact.avatarId} size={64} ringColor={healthScoreColor(score)} />
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
  screen: { flex: 1, backgroundColor: SKY.base },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600", color: SKY.text },
  storyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: SKY.chip,
    borderWidth: 1,
    borderColor: SKY.chipBorder,
  },
  storyBtnText: { color: SKY.text, fontWeight: "600", fontSize: 14 },
  sunWrap: { position: "absolute", width: SUN_SIZE, alignItems: "center" },
  sunLabel: { position: "absolute", top: SUN_SIZE / 2 - 10, fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#5A2E00" },
  planetWrap: { position: "absolute", width: PLANET + 40, alignItems: "center", zIndex: 2 },
  planetHit: { alignItems: "center", minWidth: 48, minHeight: 48 },
  planetLabel: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: "600", color: SKY.text, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4, maxWidth: PLANET + 40 },
  nodeWrap: { position: "absolute", alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginTop: 8 },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: SKY.chipBorder,
    backgroundColor: SKY.chip,
  },
  legendText: { fontSize: 13, fontWeight: "500", color: SKY.text },
  hintRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16, paddingHorizontal: 20, marginTop: 14 },
  hintItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  hintText: { fontSize: 13, color: SKY.sub, fontWeight: "500" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32, paddingBottom: 100 },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: "600", color: SKY.text, textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 20, color: SKY.sub, textAlign: "center" },
  emptyBtn: { marginTop: 6, minHeight: 48, paddingHorizontal: 20, borderRadius: 10, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 6 },
  emptyBtnText: { fontSize: 14, fontWeight: "600", color: SKY.base },
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
