import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const typography = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.textSub,
  },
  body: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.text,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  small: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textSub,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.7,
  },
});
