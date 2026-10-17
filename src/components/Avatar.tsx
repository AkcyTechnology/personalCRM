import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

const PALETTE = [colors.primary, "#2563EB", colors.success, colors.warning, "#0E7490", colors.accent];

export function initials(name?: string) {
  return (
    (name || "?")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toLocaleUpperCase("tr-TR") ?? "")
      .join("") || "?"
  );
}

export function avatarColor(name?: string) {
  let h = 0;
  for (const c of name || "") h += c.charCodeAt(0);
  return PALETTE[h % PALETTE.length];
}

type Props = {
  name: string;
  size?: number;
  /** Optional status ring (e.g. relationship health colour). */
  ringColor?: string;
};

/** Initials avatar; the optional ring communicates status without words. */
export default function Avatar({ name, size = 44, ringColor }: Props) {
  const color = avatarColor(name);
  const inner = ringColor ? size - 8 : size;
  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2 },
        ringColor ? { borderWidth: 2.5, borderColor: ringColor } : null,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.inner,
          { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: color + "1A" },
        ]}
      >
        <Text style={[styles.text, { color, fontSize: Math.round(inner * 0.36) }]} allowFontScaling={false}>
          {initials(name)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: "center", justifyContent: "center" },
  inner: { alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "800" },
});
