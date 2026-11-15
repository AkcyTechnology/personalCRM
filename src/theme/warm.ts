import { colorScheme } from "./colors";

/**
 * Warm palette for the redesigned People screen and the tab bar: off-white
 * paper, butter yellow for what's selected, dark mustard for the main action.
 * No blues or cool greys. Light values are the brief's; the dark set keeps the
 * same warm hues for users who chose dark mode. All text pairs are ≥ 4.5:1.
 */
const light = {
  bg: "#FAF8F2",
  surface: "#FFFEFA",
  border: "#E8E0D1",
  selected: "#F6E8AE",
  onSelected: "#28251E",
  primary: "#76520F",
  onPrimary: "#FFFFFF",
  text: "#28251E",
  textSub: "#665D50",
  overlay: "rgba(40,37,30,0.38)",
  shadow: "#3A3020",
  danger: "#B42318",
  success: "#3F6B2A",
};

const dark: typeof light = {
  bg: "#1B1915",
  surface: "#23201B",
  border: "#3A3429",
  selected: "#E9D58A",
  onSelected: "#28251E",
  primary: "#E2BE62",
  onPrimary: "#28251E",
  text: "#F3EFE6",
  textSub: "#B9AE9B",
  overlay: "rgba(0,0,0,0.55)",
  shadow: "#000000",
  danger: "#F28B82",
  success: "#9CCB86",
};

/** Resolved once, like `colors`: the theme is applied before screens load. */
export const warm = colorScheme() === "dark" ? dark : light;

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
