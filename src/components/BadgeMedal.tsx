import { memo } from "react";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

export type MedalId = "seed" | "streak" | "goal" | "social" | "loyal" | "tree";

type Props = { id: MedalId; earned: boolean; size?: number };

/** Octagon around (50,50) with flat top, as an SVG path. */
function octagon(r: number): string {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = ((22.5 + i * 45) * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join(" L")} Z`;
}
const OUTER = octagon(47);
const INNER = octagon(41);

/** Soft face tint per medal when earned. */
const FACE: Record<MedalId, [string, string]> = {
  seed: ["#FFF8EC", "#F6E7CC"],
  streak: ["#FFF4E8", "#FBDDBF"],
  goal: ["#F3F6FC", "#DCE5F5"],
  social: ["#F4F2FC", "#E1DCF5"],
  loyal: ["#FDF1EF", "#F5D9D6"],
  tree: ["#F2F7EE", "#DCE9D3"],
};
const LOCKED_FACE: [string, string] = ["#F1F4F8", "#DCE2EA"];
const LOCKED_INK = "#9AA9BD";
const LOCKED_INK_DARK = "#7E8DA3";

/** Medal artwork in a 100×100 box. */
function Art({ id, earned }: { id: MedalId; earned: boolean }) {
  const ink = (c: string) => (earned ? c : LOCKED_INK);
  const inkDark = (c: string) => (earned ? c : LOCKED_INK_DARK);
  switch (id) {
    case "seed":
      return (
        <G>
          {/* sprout */}
          <Path d="M50 56 C50 46 52 40 56 35" stroke={inkDark("#6F8F4E")} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Path d="M56 35 C60 26 70 24 74 25 C72 33 64 38 56 35 Z" fill={ink("#7FA45A")} />
          {/* seed */}
          <Path d="M34 64 C34 54 46 50 56 53 C66 56 68 66 62 71 C55 77 34 75 34 64 Z" fill={ink("#D9BE95")} />
          <Path d="M38 66 C45 60 54 59 63 63" stroke={inkDark("#8C6A43")} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </G>
      );
    case "streak":
      return (
        <G>
          <Path d="M51 22 C56 34 70 40 69 58 C68 71 59 78 49 78 C38 78 30 70 31 58 C32 48 38 44 41 36 C43 44 46 47 49 48 C47 39 48 30 51 22 Z" fill={ink("#F08A3C")} />
          <Path d="M50 50 C54 56 60 60 59 67 C58 73 54 76 49 76 C44 76 41 72 41 67 C41 61 47 58 50 50 Z" fill={ink("#F9B36B")} />
        </G>
      );
    case "goal":
      return (
        <G>
          <Rect x={33} y={24} width={3.6} height={54} rx={1.8} fill={inkDark("#A58D6A")} />
          <Circle cx={34.8} cy={24} r={3.4} fill={inkDark("#C2A97F")} />
          <Path d="M37 28 C46 24 52 32 60 29 C65 27 69 26 72 27 L72 50 C66 49 62 51 56 53 C48 56 43 50 37 52 Z" fill={ink("#4C78D6")} />
          <Path d="M37 28 C46 24 52 32 60 29 L60 33 C52 36 46 29 37 33 Z" fill={earned ? "#6E95E6" : "#B3BFCF"} />
        </G>
      );
    case "social":
      return (
        <G>
          <Circle cx={40} cy={40} r={8} fill={ink("#7C82D6")} />
          <Circle cx={61} cy={36} r={8} fill={ink("#9097E0")} />
          <Path d="M24 70 C24 58 31 52 40 52 C49 52 56 58 56 70 Z" fill={ink("#7C82D6")} />
          <Path d="M46 66 C46 54 52 48 61 48 C70 48 77 54 77 66 Z" fill={ink("#9097E0")} />
        </G>
      );
    case "loyal":
      return (
        <G>
          <Path d="M50 76 C40 67 26 58 26 44 C26 35 33 29 40 29 C45 29 48 32 50 35 C52 32 55 29 60 29 C67 29 74 35 74 44 C74 58 60 67 50 76 Z" fill={ink("#E3A4A0")} />
          <Path d="M50 35 C52 32 55 29 60 29 C67 29 74 35 74 44 C74 52 69 58 62 64 C64 55 60 46 50 41 Z" fill={earned ? "#D58C88" : LOCKED_INK_DARK} opacity={0.55} />
        </G>
      );
    case "tree":
      return (
        <G>
          <Path d="M50 80 L50 34" stroke={inkDark("#3E7A72")} strokeWidth={3} strokeLinecap="round" />
          <Path d="M50 50 C44 44 36 42 30 44 C34 51 42 54 50 52 Z" fill={ink("#4F948A")} />
          <Path d="M50 46 C56 40 64 38 70 40 C66 47 58 50 50 48 Z" fill={ink("#5BA399")} />
          <Path d="M50 62 C44 56 36 54 31 56 C35 63 43 66 50 64 Z" fill={ink("#5BA399")} />
          <Path d="M50 58 C56 52 64 50 69 52 C65 59 57 62 50 60 Z" fill={ink("#4F948A")} />
          <Path d="M50 36 C47 30 48 24 52 20 C55 25 54 31 50 36 Z" fill={ink("#4F948A")} />
        </G>
      );
  }
}

/**
 * Octagonal "paper" medal: a warm rim, a softly tinted face with embossed
 * waves, and the medal's artwork. Locked medals turn grey with a small lock.
 */
function BadgeMedal({ id, earned, size = 72 }: Props) {
  const face = earned ? FACE[id] : LOCKED_FACE;
  const g = `${id}-${earned ? "on" : "off"}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`rim-${g}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={earned ? "#F2E6CF" : "#E9E3D6"} />
          <Stop offset="1" stopColor={earned ? "#CDB68E" : "#C9C0AE"} />
        </LinearGradient>
        <LinearGradient id={`face-${g}`} x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor={face[0]} />
          <Stop offset="1" stopColor={face[1]} />
        </LinearGradient>
      </Defs>
      {/* soft drop shadow */}
      <Path d={OUTER} fill="#000" opacity={0.08} transform="translate(0 2.2)" />
      <Path d={OUTER} fill={`url(#rim-${g})`} />
      <Path d={INNER} fill={`url(#face-${g})`} />
      {/* embossed waves */}
      <Path d="M14 66 C30 58 46 74 64 66 C74 61 82 62 88 64" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.2} fill="none" />
      <Path d="M16 74 C34 68 50 82 70 74 C78 71 84 72 87 73" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1} fill="none" />
      <Path d="M20 30 C34 22 46 34 60 26" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1} fill="none" />
      <Art id={id} earned={earned} />
      {earned ? null : (
        <G>
          <Circle cx={80} cy={80} r={11} fill="#FFFFFF" stroke="#D8CDB8" strokeWidth={1.2} />
          <Rect x={75.2} y={79} width={9.6} height={7.4} rx={1.6} fill={LOCKED_INK_DARK} />
          <Path d="M77.2 79 V76.6 C77.2 74.8 78.4 73.6 80 73.6 C81.6 73.6 82.8 74.8 82.8 76.6 V79" stroke={LOCKED_INK_DARK} strokeWidth={1.6} fill="none" />
        </G>
      )}
    </Svg>
  );
}

export default memo(BadgeMedal);
