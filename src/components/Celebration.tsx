import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors } from "../theme/colors";

type Payload = { title: string; subtitle?: string };
let trigger: ((p: Payload) => void) | null = null;

/** Fire a short, celebratory burst (respects "Reduce motion"). */
export function celebrate(title: string, subtitle?: string) {
  trigger?.({ title, subtitle });
}

const PIECES = ["💛", "🌱", "✨", "💚", "🎉", "💜", "🌸", "⭐"];
const COUNT = 18;

export default function CelebrationHost() {
  const { width, height } = useWindowDimensions();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const seeds = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      angle: (Math.PI * 2 * i) / COUNT + Math.random() * 0.4,
      distance: 110 + Math.random() * 110,
      rotate: (Math.random() - 0.5) * 2,
      glyph: PIECES[i % PIECES.length],
    }))
  ).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    trigger = (p) => {
      setPayload(p);
      progress.setValue(0);
      card.setValue(0);
      AccessibilityInfo.announceForAccessibility?.([p.title, p.subtitle].filter(Boolean).join(". "));
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(card, { toValue: 1, useNativeDriver: true, friction: 6 }),
          Animated.delay(1200),
          Animated.timing(card, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]),
      ]).start(() => setPayload(null));
    };
    return () => {
      trigger = null;
      sub.remove();
    };
  }, [card, progress]);

  if (!payload) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {!reduceMotion &&
        seeds.map((s, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.piece,
              {
                left: width / 2 - 12,
                top: height / 2 - 40,
                opacity: progress.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.angle) * s.distance] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(s.angle) * s.distance + 60] }) },
                  { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0rad", `${s.rotate * 3}rad`] }) },
                  { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.9] }) },
                ],
              },
            ]}
          >
            {s.glyph}
          </Animated.Text>
        ))}
      <Animated.View
        style={[
          styles.card,
          {
            top: height / 2 - 70,
            opacity: card,
            transform: [{ scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          },
        ]}
      >
        <Text style={styles.title}>{payload.title}</Text>
        {payload.subtitle ? <Text style={styles.subtitle}>{payload.subtitle}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", fontSize: 24 },
  card: {
    position: "absolute",
    alignSelf: "center",
    left: 32,
    right: 32,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 15, fontWeight: "700", color: colors.warning, marginTop: 6, textAlign: "center" },
});
