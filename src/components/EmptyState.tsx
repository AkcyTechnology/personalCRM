import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  /** Ionicons name (preferred) or a single emoji. */
  icon: IconName | string;
  title: string;
  description?: string;
  buttonLabel?: string;
  onPress?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  fill?: boolean;
};

export default function EmptyState({
  icon, title, description, buttonLabel, onPress, secondaryLabel, onSecondaryPress, fill = true,
}: Props) {
  const isIonicon = icon in Ionicons.glyphMap;
  return (
    <View style={[styles.wrap, fill && styles.wrapFill]}>
      <View style={styles.iconBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {isIonicon ? (
          <Ionicons name={icon as IconName} size={34} color={colors.primary} />
        ) : (
          <Text style={styles.iconText}>{icon}</Text>
        )}
      </View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {buttonLabel && onPress ? (
        <TouchableOpacity style={styles.addBtn} onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.addBtnText}>{buttonLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {secondaryLabel && onSecondaryPress ? (
        <TouchableOpacity onPress={onSecondaryPress} style={styles.secondaryBtn} accessibilityRole="button">
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    paddingVertical: 32,
    gap: 10,
  },
  wrapFill: { flex: 1 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconText: { fontSize: 34 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
  desc: { fontSize: 14, color: colors.textSub, textAlign: "center", lineHeight: 20 },
  addBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: radius.button,
  },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  secondaryBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
});
