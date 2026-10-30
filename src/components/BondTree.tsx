import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { colors } from "../theme/colors";
import type { TreeState } from "../utils/engagement";
import { useReduceMotion } from "../hooks/useReduceMotion";

type Props = {
  tree: TreeState;
  size?: number;
  accessibilityLabel?: string;
};

const LEAF = "M0,0 C4,-6 12,-6 16,0 C12,6 4,6 0,0 Z";
const GOLDEN = 137.508;

/** Canopy centre and radii per stage (stages 3–5). */
const CANOPY = [
  null,
  null,
  null,
  { cx: 100, cy: 92, rx: 46, ry: 40 },
  { cx: 100, cy: 80, rx: 60, ry: 52 },
  { cx: 100, cy: 74, rx: 70, ry: 60 },
];

/** Deterministic golden-angle spread, so leaves never jump around between renders. */
function spread(n: number, c: { cx: number; cy: number; rx: number; ry: number }) {
  return Array.from({ length: n }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / n);
    const a = (i * GOLDEN * Math.PI) / 180;
    return { x: c.cx + Math.cos(a) * r * c.rx, y: c.cy + Math.sin(a) * r * c.ry, angle: (i * GOLDEN) % 360 };
  });
}

function Leaf({ x, y, angle, color, scale = 1 }: { x: number; y: number; angle: number; color: string; scale?: number }) {
  return <Path d={LEAF} fill={color} transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} />;
}

function Blossom({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <Circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3.6} cy={Math.sin((a * Math.PI) / 180) * 3.6} r={3.2} fill={colors.warm} />
      ))}
      <Circle r={2.2} fill={colors.sun} />
    </G>
  );
}

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <Path d="M0,-6 L1.4,-1.4 L6,0 L1.4,1.4 L0,6 L-1.4,1.4 L-6,0 L-1.4,-1.4 Z" fill={colors.brand} transform={`translate(${x} ${y}) scale(${s})`} />;
}

/**
 * The user's "bond tree": grows one leaf per moment, blossoms for each person
 * reached this week, and rests (never dies) when the user is away.
 */
export default function BondTree({ tree, size = 140, accessibilityLabel }: Props) {
  const reduceMotion = useReduceMotion();
  const sway = useRef(new Animated.Value(0)).current;
  const bump = useRef(new Animated.Value(1)).current;
  const prevLeaves = useRef(tree.leaves);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, sway]);

  // A new leaf: a short, happy bump.
  useEffect(() => {
    if (tree.leaves > prevLeaves.current && !reduceMotion) {
      Animated.sequence([
        Animated.timing(bump, { toValue: 1.08, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(bump, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    prevLeaves.current = tree.leaves;
  }, [bump, reduceMotion, tree.leaves]);

  const leafColors = [colors.primary, colors.success, colors.brand];
  const dim = tree.vitality === "resting" ? 0.55 : 1;

  const art = useMemo(() => {
    const { stage, leaves, blossoms } = tree;
    if (stage === 0) {
      return (
        <G>
          <Ellipse cx={100} cy={170} rx={11} ry={8} fill={colors.bark} />
          <Path d="M96,166 Q100,162 104,166" stroke={colors.primarySoft} strokeWidth={1.6} fill="none" />
        </G>
      );
    }
    if (stage === 1) {
      return (
        <G>
          <Path d="M100,178 Q99,160 100,146" stroke={colors.success} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Leaf x={100} y={148} angle={200} color={colors.success} scale={1.3} />
          <Leaf x={100} y={148} angle={-20} color={colors.primary} scale={1.3} />
        </G>
      );
    }
    if (stage === 2) {
      const n = Math.max(4, Math.min(leaves, 9));
      return (
        <G>
          <Path d="M100,178 Q97,150 100,112" stroke={colors.bark} strokeWidth={4} fill="none" strokeLinecap="round" />
          {Array.from({ length: n }, (_, i) => {
            const y = 160 - i * 5.5;
            const left = i % 2 === 0;
            return <Leaf key={i} x={100} y={y} angle={left ? 205 - i * 3 : -25 + i * 3} color={leafColors[i % 3]} scale={1.4} />;
          })}
          {blossoms > 0 ? <Blossom x={100} y={110} /> : null}
        </G>
      );
    }
    const c = CANOPY[stage]!;
    const trunkTop = c.cy + c.ry * 0.4;
    const pts = spread(Math.max(leaves, 14), c);
    const flowerPts = spread(blossoms, { ...c, rx: c.rx * 0.8, ry: c.ry * 0.8 });
    return (
      <G>
        <Path
          d={`M92,180 Q95,${trunkTop + 30} 97,${trunkTop} L103,${trunkTop} Q105,${trunkTop + 30} 108,180 Z`}
          fill={colors.bark}
        />
        <Path d={`M99,${trunkTop + 20} Q84,${trunkTop + 4} 74,${trunkTop - 6}`} stroke={colors.bark} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d={`M101,${trunkTop + 14} Q118,${trunkTop} 128,${trunkTop - 10}`} stroke={colors.bark} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Ellipse cx={c.cx} cy={c.cy} rx={c.rx * 0.92} ry={c.ry * 0.92} fill={colors.primarySoft} />
        {pts.map((p, i) => (
          <Leaf key={i} x={p.x} y={p.y} angle={p.angle} color={leafColors[i % 3]} scale={stage === 3 ? 1.45 : 1.3} />
        ))}
        {flowerPts.map((p, i) => <Blossom key={`b${i}`} x={p.x} y={p.y} />)}
      </G>
    );
    // leafColors is rebuilt from tokens on each render; the tree inputs are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.stage, tree.leaves, tree.blossoms]);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-1.5deg", "1.5deg"] });

  return (
    <View
      style={{ width: size, height: size }}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200" style={{ position: "absolute" }}>
        <Ellipse cx={100} cy={182} rx={64} ry={9} fill={colors.primarySoft} />
      </Svg>
      <Animated.View
        style={{ width: size, height: size, opacity: dim, transformOrigin: "50% 90%", transform: [{ rotate }, { scale: bump }] }}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {art}
          {tree.vitality === "thriving" && tree.stage >= 2 ? (
            <G>
              <Sparkle x={40} y={60} s={0.9} />
              <Sparkle x={160} y={44} s={0.7} />
              <Sparkle x={168} y={118} s={0.6} />
            </G>
          ) : null}
        </Svg>
      </Animated.View>
    </View>
  );
}
