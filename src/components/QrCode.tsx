import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import qrcode from "qrcode-generator";

/** UTF-8 bytes of a string (surrogate pairs included). */
export function utf8Bytes(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

// The library's default encoder keeps only the low byte of each character,
// which turns "ş", "ğ", "ı" into garbage. Both its CommonJS and ES builds read
// `qrcode.stringToBytes` when adding data, so we point that at UTF-8.
qrcode.stringToBytes = utf8Bytes;

/** Light margin (in modules) that scanners need around the code. */
const QUIET = 2;

type Props = {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  accessibilityLabel?: string;
};

/** QR code drawn as a single SVG path (one native view instead of one per module). */
export function qrMatrix(value: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(value || " ");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

export default function QrCode({ value, size = 96, color = "#111827", backgroundColor = "#FFFFFF", accessibilityLabel }: Props) {
  const qr = qrcode(0, "M");
  qr.addData(value || " ");
  qr.make();

  const count = qr.getModuleCount();
  let d = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
    }
  }

  return (
    <View
      style={{ width: size, height: size }}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${count + 2 * QUIET} ${count + 2 * QUIET}`}>
        <Rect x={0} y={0} width={count + 2 * QUIET} height={count + 2 * QUIET} fill={backgroundColor} />
        <Path d={d} fill={color} />
      </Svg>
    </View>
  );
}
