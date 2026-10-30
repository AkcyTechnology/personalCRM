/**
 * Design tokens. Light text/interactive colours meet WCAG 2.2 AA (≥ 4.5:1) on white:
 * primary 4.51, textSub 4.83, textMuted 4.52, placeholder 4.83, warmStrong 5.18,
 * success 5.0, warning 5.0, danger 4.83. Dark values meet AA on `bg` and `card`.
 *
 * Palette rule: teal is the brand, coral (`warm`) marks human moments
 * (celebrations, birthdays, the bond tree's blossoms), purple (`accent`) is kept
 * for the Universe and Story. Everything else is neutral.
 *
 * `brand` is the original logo teal — decoration only (rings, soft fills).
 * `onFill` is the text/icon colour on a filled button or chip (primary, accent,
 * warm, success, warning, danger). `white` is literal white, for content on
 * fixed dark artwork such as the Story card.
 *
 * `colors` is filled with the light or dark set by `applyColorScheme` before any
 * screen module is loaded (see index.ts), so module-level StyleSheets pick up the
 * right values. Switching theme therefore takes effect on the next launch.
 */
const light = {
  brand:          "#00B5AC",
  primary:        "#00857E",
  primaryDark:    "#00706A",
  primarySoft:    "#E0F7F6",
  primaryLight:   "#E6F8F6",
  primaryBorder:  "#BDEDEA",
  primaryMid:     "#00857E99",

  accent:         "#7C3AED",
  accentSoft:     "#F3F0FF",
  accentMid:      "#7C3AED55",

  warm:           "#F2765B",
  warmStrong:     "#C2410C",
  warmSoft:       "#FFF1EC",
  bark:           "#8A5A3B",
  sun:            "#FBBF24",

  secondary:      "#DB2777",
  secondarySoft:  "#FCE7F3",

  white:          "#FFFFFF",
  onFill:         "#FFFFFF",
  surface:        "#FFFFFF",
  bg:             "#FFFFFF",
  card:           "#F8FAFB",
  border:         "#E5E7EB",
  borderLight:    "#F3F4F6",
  overlay:        "rgba(17,24,39,0.45)",
  inverse:        "#111827",
  onInverse:      "#FFFFFF",
  inverseAccent:  "#5EEAD4",
  shadow:         "#000000",

  text:           "#111827",
  textSub:        "#6B7280",
  textMuted:      "#6E7581",
  placeholder:    "#6B7280",

  success:        "#15803D",
  successSoft:    "#DCFCE7",
  warning:        "#B45309",
  warningSoft:    "#FEF3C7",
  danger:         "#DC2626",
  dangerSoft:     "#FEE2E2",

  // White text stays ≥ 4.5:1 across the whole gradient.
  gradientFrom:   "#00857E",
  gradientTo:     "#00706A",
};

export type Palette = typeof light;

const dark: Palette = {
  brand:          "#00B5AC",
  primary:        "#2EC4B6",
  primaryDark:    "#5EDBD0",
  primarySoft:    "#0F2E2C",
  primaryLight:   "#112B29",
  primaryBorder:  "#1F4D49",
  primaryMid:     "#2EC4B699",

  accent:         "#B59CFF",
  accentSoft:     "#231C3A",
  accentMid:      "#B59CFF55",

  warm:           "#FF8A70",
  warmStrong:     "#FF8A70",
  warmSoft:       "#33201B",
  bark:           "#B07D57",
  sun:            "#FBBF24",

  secondary:      "#F472B6",
  secondarySoft:  "#3A1A2B",

  white:          "#FFFFFF",
  onFill:         "#04201E",
  surface:        "#182024",
  bg:             "#0E1416",
  card:           "#182024",
  border:         "#2A3438",
  borderLight:    "#20292D",
  overlay:        "rgba(0,0,0,0.6)",
  inverse:        "#E8EEEC",
  onInverse:      "#0E1416",
  inverseAccent:  "#00706A",
  shadow:         "#000000",

  text:           "#F1F5F4",
  textSub:        "#A9B4B8",
  textMuted:      "#98A4A9",
  placeholder:    "#98A4A9",

  success:        "#4ADE80",
  successSoft:    "#14301F",
  warning:        "#FBBF24",
  warningSoft:    "#33280F",
  danger:         "#F87171",
  dangerSoft:     "#3A1A1A",

  gradientFrom:   "#3DD6C8",
  gradientTo:     "#2EC4B6",
};

export type ColorScheme = "light" | "dark";
export type ThemePreference = "system" | ColorScheme;

export const colors: Palette = { ...light };
let currentScheme: ColorScheme = "light";

export function applyColorScheme(scheme: ColorScheme) {
  currentScheme = scheme;
  Object.assign(colors, scheme === "dark" ? dark : light);
}

export function colorScheme(): ColorScheme {
  return currentScheme;
}

/** Categorical colours for avatars and charts — brand-family hues only, no blues. */
export function categorical(): string[] {
  return [colors.primary, colors.warm, colors.accent, colors.secondary, colors.warning, colors.success];
}

export type ColorKey = keyof Palette;
