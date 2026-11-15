import Svg, { Circle, Ellipse, Path } from "react-native-svg";

/** "Evren" tab icon: an orbit with three connected nodes. */
export default function OrbitIcon({ size = 24, color, filled = false }: { size?: number; color: string; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ellipse cx={12} cy={12} rx={9.5} ry={5.5} transform="rotate(-25 12 12)" stroke={color} strokeWidth={1.6} fill="none" />
      <Path d="M6.2 15.4 L12 7.6 L17.6 12.6" stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={6.2} cy={15.4} r={2.2} fill={filled ? color : "none"} stroke={color} strokeWidth={1.6} />
      <Circle cx={12} cy={7.6} r={2.2} fill={filled ? color : "none"} stroke={color} strokeWidth={1.6} />
      <Circle cx={17.6} cy={12.6} r={2.2} fill={filled ? color : "none"} stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
