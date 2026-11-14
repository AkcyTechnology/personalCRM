import { Image, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { avatarSource } from "../data/avatars";

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

type Props = {
  /** Kept for callers and accessibility; the picture never depends on it. */
  name?: string;
  /** Chosen illustrated avatar (see data/avatars.ts). */
  avatarId?: string;
  /** A real photo, when the contact has one; wins over the avatar. */
  photoUri?: string;
  size?: number;
  /** Optional status ring (e.g. follow-up status colour). */
  ringColor?: string;
};

/**
 * The one avatar used everywhere (lists, profile, person of the day, search,
 * Universe). Photo → chosen illustration → neutral person icon. Nothing is
 * guessed from the name or phone number.
 */
export default function Avatar({ avatarId, photoUri, size = 44, ringColor }: Props) {
  const inner = ringColor ? size - 6 : size;
  const source = photoUri ? { uri: photoUri } : avatarSource(avatarId);
  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2 },
        ringColor ? { borderWidth: 2, borderColor: ringColor } : null,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {source ? (
        <Image source={source} style={{ width: inner, height: inner, borderRadius: inner / 2 }} resizeMode="cover" />
      ) : (
        <View style={[styles.neutral, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Ionicons name="person" size={Math.round(inner * 0.5)} color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: "center", justifyContent: "center" },
  neutral: { alignItems: "center", justifyContent: "center", backgroundColor: colors.borderLight },
});
