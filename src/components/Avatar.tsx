import { Image, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { avatarSource, fallbackAvatarId } from "../data/avatars";

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
  /** Only seeds a stable stand-in picture for contacts saved without an avatar. */
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
 * Universe). Photo → chosen illustration → a stable stand-in illustration,
 * so nobody shows up as an empty silhouette.
 */
export default function Avatar({ name, avatarId, photoUri, size = 44, ringColor }: Props) {
  const inner = ringColor ? size - 6 : size;
  const source = photoUri ? { uri: photoUri } : avatarSource(avatarId) ?? avatarSource(fallbackAvatarId(name?.trim() || undefined));
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
