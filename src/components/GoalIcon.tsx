import Svg, { Circle, Path, Rect } from "react-native-svg";

type Props = { goal: string; size?: number; color: string };

/**
 * Line icons for the usage purposes: single colour, one stroke width, round
 * caps, drawn on a 16-unit grid so they stay crisp at 16 dp.
 */
export default function GoalIcon({ goal, size = 16, color }: Props) {
  const stroke = { stroke: color, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {goal === "personal" ? (
        <>
          {/* Two small heads side by side, shoulders leaning towards each other */}
          <Circle cx={5.2} cy={5} r={2} {...stroke} />
          <Circle cx={10.8} cy={5} r={2} {...stroke} />
          <Path d="M1.8 13.2 C2.2 10.4 4.2 9 6.4 9.4 C7.2 9.6 7.7 10 8 10.4" {...stroke} />
          <Path d="M14.2 13.2 C13.8 10.4 11.8 9 9.6 9.4 C8.8 9.6 8.3 10 8 10.4" {...stroke} />
        </>
      ) : goal === "professional" ? (
        <>
          {/* Rounded briefcase, short handle, small clasp */}
          <Rect x={1.8} y={4.8} width={12.4} height={8.6} rx={2} {...stroke} />
          <Path d="M6 4.8 V3.6 C6 3 6.4 2.6 7 2.6 H9 C9.6 2.6 10 3 10 3.6 V4.8" {...stroke} />
          <Path d="M1.8 8.4 H6.8 M9.2 8.4 H14.2" {...stroke} />
          <Rect x={6.8} y={7.6} width={2.4} height={1.8} rx={0.6} {...stroke} />
        </>
      ) : goal === "networking" ? (
        <>
          {/* Two linked nodes and a third joining with a short diagonal (Evren's language) */}
          <Path d="M4 11.5 L10.5 5" {...stroke} />
          <Path d="M10.5 11.4 L12 9.9" {...stroke} />
          <Circle cx={3.6} cy={11.9} r={1.9} {...stroke} />
          <Circle cx={10.9} cy={4.6} r={1.9} {...stroke} />
          <Circle cx={12.9} cy={11.9} r={1.6} {...stroke} />
        </>
      ) : (
        <>
          {/* Calendar with two hanger lines and a small four-point star */}
          <Rect x={2} y={3.4} width={12} height={10.6} rx={2} {...stroke} />
          <Path d="M5.2 1.8 V4.6 M10.8 1.8 V4.6" {...stroke} />
          <Path d="M8 6.8 L8.6 8.5 L10.3 9.1 L8.6 9.7 L8 11.4 L7.4 9.7 L5.7 9.1 L7.4 8.5 Z" {...stroke} />
        </>
      )}
    </Svg>
  );
}
