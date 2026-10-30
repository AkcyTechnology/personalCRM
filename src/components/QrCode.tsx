import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import qrcode from "qrcode-generator";

type Props = {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  accessibilityLabel?: string;
};

/** QR code drawn as a single SVG path (one native view instead of one per module). */
export default function QrCode({ value, size = 96, color = "#111827", backgroundColor = "#FFFFFF", accessibilityLabel }: Props) {
  const qr = qrcode(0, "M");
  qr.addData(value || " ");
  qr.make();

  const count = qr.getModuleCount();
  let d = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
    }
  }

  return (
    <View
      style={{ width: size, height: size }}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
        <Rect x={0} y={0} width={count} height={count} fill={backgroundColor} />
        <Path d={d} fill={color} />
      </Svg>
    </View>
  );
}
