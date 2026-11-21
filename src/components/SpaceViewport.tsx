import { useEffect, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { t } from "../i18n";

const MIN = 0.6;
const MAX = 3;

type Props = {
  /** Size of the viewport on screen; the solar system is laid out to this size. */
  width: number;
  height: number;
  reduceMotion: boolean;
  children: ReactNode;
};

/** Seeded pseudo-random numbers so the sky looks the same on every open. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clamp(v: number, lo: number, hi: number) {
  "worklet";
  return lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));
}

/**
 * A larger "space" around the solar system: pinch to zoom (0.6×–3×), drag to
 * pan. Two star layers drift at different speeds for depth; a black hole
 * waits off to the left and a nebula to the right. Taps still reach the
 * planets and people inside.
 */
export default function SpaceViewport({ width, height, reduceMotion, children }: Props) {
  // The world is wider and taller than the screen; the system sits in its middle.
  const padX = width * 0.75;
  const padY = height * 0.35;
  const worldW = width + padX * 2;
  const worldH = height + padY * 2;

  const scale = useSharedValue(1);
  const tx = useSharedValue(-padX);
  const ty = useSharedValue(-padY);
  const start = useSharedValue({ x: -padX, y: -padY, s: 1 });
  const spin = useSharedValue(0);

  useEffect(() => {
    tx.value = -padX;
    ty.value = -padY;
  }, [padX, padY, tx, ty]);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1, false);
  }, [reduceMotion, spin]);

  // Allowed translation for a scale, so the screen never leaves the world.
  const bounds = (s: number) => {
    "worklet";
    return {
      minX: width - (worldW * (s + 1)) / 2,
      maxX: (worldW * (s - 1)) / 2,
      minY: height - (worldH * (s + 1)) / 2,
      maxY: (worldH * (s - 1)) / 2,
    };
  };

  const pan = usePanGesture({
    minDistance: 6,
    onBegin: () => {
      "worklet";
      start.value = { x: tx.value, y: ty.value, s: scale.value };
    },
    onUpdate: (e) => {
      "worklet";
      const b = bounds(scale.value);
      tx.value = clamp(start.value.x + e.translationX, b.minX, b.maxX);
      ty.value = clamp(start.value.y + e.translationY, b.minY, b.maxY);
    },
  });

  const pinch = usePinchGesture({
    onBegin: () => {
      "worklet";
      start.value = { x: tx.value, y: ty.value, s: scale.value };
    },
    onUpdate: (e) => {
      "worklet";
      const s = Math.min(MAX, Math.max(MIN, start.value.s * e.scale));
      scale.value = s;
      const b = bounds(s);
      tx.value = clamp(tx.value, b.minX, b.maxX);
      ty.value = clamp(ty.value, b.minY, b.maxY);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  const zoomTo = (s: number, reset = false) => {
    const next = Math.min(MAX, Math.max(MIN, s));
    const b = bounds(next);
    scale.value = withTiming(next, { duration: 250 });
    tx.value = withTiming(reset ? -padX : clamp(tx.value, b.minX, b.maxX), { duration: 250 });
    ty.value = withTiming(reset ? -padY : clamp(ty.value, b.minY, b.maxY), { duration: 250 });
  };

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));
  // Far stars move a little, near stars a bit more: parallax depth.
  const farStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (tx.value + padX) * 0.15 }, { translateY: (ty.value + padY) * 0.15 }] }));
  const nearStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (tx.value + padX) * 0.4 }, { translateY: (ty.value + padY) * 0.4 }] }));
  const diskStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const diskBackStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value * 220}deg` }] }));

  const stars = useMemo(() => {
    const r = rng(7);
    const make = (n: number, size: [number, number]) =>
      Array.from({ length: n }, () => ({
        x: r() * width * 1.6 - width * 0.3,
        y: r() * height * 1.6 - height * 0.3,
        s: size[0] + r() * (size[1] - size[0]),
        o: 0.35 + r() * 0.6,
      }));
    return { far: make(70, [0.6, 1.4]), near: make(26, [1.2, 2.4]) };
  }, [width, height]);

  const hole = { x: padX * 0.42, y: padY + height * 0.72, size: Math.min(220, width * 0.55) };
  const nebula = { x: worldW - padX * 0.5, y: padY * 0.8 };

  return (
    <View style={[styles.viewport, { width, height }]}>
      {/* Parallax stars (screen space, behind everything). */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, farStyle]}>
        <Svg width={width * 1.6} height={height * 1.6} style={{ position: "absolute", left: -width * 0.3, top: -height * 0.3 }}>
          {stars.far.map((s, i) => <Circle key={i} cx={s.x + width * 0.3} cy={s.y + height * 0.3} r={s.s} fill="#FFFFFF" opacity={s.o * 0.7} />)}
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, nearStyle]}>
        <Svg width={width * 1.6} height={height * 1.6} style={{ position: "absolute", left: -width * 0.3, top: -height * 0.3 }}>
          {stars.near.map((s, i) => <Circle key={i} cx={s.x + width * 0.3} cy={s.y + height * 0.3} r={s.s} fill="#DCE7FF" opacity={s.o} />)}
        </Svg>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH }, worldStyle]}>
          {/* Nebula on the far right. */}
          <View pointerEvents="none" style={{ position: "absolute", left: nebula.x - 180, top: nebula.y - 140 }}>
            <Svg width={360} height={280}>
              <Defs>
                <RadialGradient id="neb1" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#C084FC" stopOpacity="0.45" />
                  <Stop offset="1" stopColor="#C084FC" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="neb2" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#22D3EE" stopOpacity="0.35" />
                  <Stop offset="1" stopColor="#22D3EE" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={150} cy={130} rx={150} ry={100} fill="url(#neb1)" />
              <Ellipse cx={220} cy={160} rx={130} ry={90} fill="url(#neb2)" />
            </Svg>
          </View>

          {/* Black hole on the far left: a dark core and a turning accretion disk. */}
          <View
            style={{ position: "absolute", left: hole.x - hole.size / 2, top: hole.y - hole.size / 2, width: hole.size, height: hole.size }}
            accessible
            accessibilityLabel={t("Kara delik")}
          >
            <Animated.View style={[StyleSheet.absoluteFill, diskBackStyle]} pointerEvents="none">
              <Svg width={hole.size} height={hole.size} viewBox="0 0 200 200">
                <Defs>
                  <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                    <Stop offset="0.35" stopColor="#7C3AED" stopOpacity="0.0" />
                    <Stop offset="0.55" stopColor="#A855F7" stopOpacity="0.35" />
                    <Stop offset="1" stopColor="#1E1B4B" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx={100} cy={100} r={100} fill="url(#halo)" />
              </Svg>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, diskStyle]} pointerEvents="none">
              <Svg width={hole.size} height={hole.size} viewBox="0 0 200 200">
                <Defs>
                  <RadialGradient id="disk" cx="50%" cy="50%" r="50%">
                    <Stop offset="0.42" stopColor="#FDE68A" stopOpacity="0.95" />
                    <Stop offset="0.6" stopColor="#F97316" stopOpacity="0.7" />
                    <Stop offset="0.8" stopColor="#BE185D" stopOpacity="0.25" />
                    <Stop offset="1" stopColor="#BE185D" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Ellipse cx={100} cy={100} rx={96} ry={34} fill="url(#disk)" />
                <Ellipse cx={100} cy={100} rx={70} ry={22} fill="none" stroke="#FFF7ED" strokeOpacity={0.5} strokeWidth={1.2} />
              </Svg>
            </Animated.View>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
              <View style={{ width: hole.size * 0.3, height: hole.size * 0.3, borderRadius: hole.size, backgroundColor: "#000", borderWidth: 2, borderColor: "rgba(253,230,138,0.85)", shadowColor: "#F59E0B", shadowOpacity: 0.9, shadowRadius: 18 }} />
            </View>
          </View>

          {/* The solar system, centred in the world. */}
          <View style={{ position: "absolute", left: padX, top: padY, width, height }}>{children}</View>
        </Animated.View>
      </GestureDetector>

      {/* Zoom controls: also the accessible way to zoom. */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrl} onPress={() => zoomTo(scale.value * 1.4)} accessibilityRole="button" accessibilityLabel={t("Yakınlaştır")}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrl} onPress={() => zoomTo(scale.value / 1.4)} accessibilityRole="button" accessibilityLabel={t("Uzaklaştır")}>
          <Ionicons name="remove" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrl} onPress={() => zoomTo(1, true)} accessibilityRole="button" accessibilityLabel={t("Ortala")}>
          <Ionicons name="locate-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.hint} pointerEvents="none">{t("Kaydır · iki parmakla yakınlaştır")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: "hidden" },
  controls: { position: "absolute", right: 12, bottom: 12, gap: 8 },
  ctrl: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  hint: { position: "absolute", left: 20, top: 4, fontSize: 12, color: "rgba(255,255,255,0.55)" },
});
