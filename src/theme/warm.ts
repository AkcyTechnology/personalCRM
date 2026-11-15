import { colors } from "./colors";

/**
 * Colours for the People screen and the tab bar, taken from the app's own
 * tokens (white background, the brand turquoise) so they follow light/dark
 * mode like every other screen. Kept as a separate map so those screens read
 * the same names as before.
 */
export const warm = {
  bg: colors.bg,
  surface: colors.surface,
  border: colors.border,
  /** Selected chip / active filter: filled turquoise. */
  selected: colors.primary,
  onSelected: colors.onFill,
  /** Softer selection (tab icon pill). */
  selectedSoft: colors.primarySoft,
  onSelectedSoft: colors.primary,
  primary: colors.primary,
  onPrimary: colors.onFill,
  text: colors.text,
  textSub: colors.textSub,
  overlay: colors.overlay,
  shadow: colors.shadow,
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
};

/** Instrument Sans, one family per weight (Android ignores fontWeight on custom fonts). */
export const fonts = {
  regular: "InstrumentSans_400Regular",
  medium: "InstrumentSans_500Medium",
  semibold: "InstrumentSans_600SemiBold",
};

/** The brief's type scale (size / line height). Text still follows the system font size. */
export const type = {
  pageTitle: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  name: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  chip: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  tab: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
} as const;
