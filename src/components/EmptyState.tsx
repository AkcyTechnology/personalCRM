import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

type Props = {
  icon: string;
  title: string;
  description: string;
  buttonLabel?: string;
  onPress?: () => void;
  fill?: boolean;
};

export default function EmptyState({ icon, title, description, buttonLabel, onPress, fill = true }: Props) {
  return (
    <View style={[styles.wrap, fill && styles.wrapFill]}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
      {buttonLabel && onPress ? (
        <TouchableOpacity style={styles.addBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>{buttonLabel}</Text>
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
    backgroundColor: colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconText: { fontSize: 34 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
  desc: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  addBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: radius.button,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
