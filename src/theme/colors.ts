/**
 * Design tokens. Text/interactive colours meet WCAG 2.2 AA (≥ 4.5:1) on white:
 * primary 4.51, textSub 4.83, textMuted 4.52, success 5.0, warning 5.0, danger 4.83.
 * `brand` is the original logo teal — use it only for decoration (rings,
 * illustrations, soft fills), never for text or as a background behind text.
 */
export const colors = {
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

  secondary:      "#DB2777",
  secondarySoft:  "#FCE7F3",

  white:          "#FFFFFF",
  bg:             "#FFFFFF",
  card:           "#F8FAFB",
  border:         "#E5E7EB",
  borderLight:    "#F3F4F6",
  overlay:        "rgba(17,24,39,0.45)",

  text:           "#111827",
  textSub:        "#6B7280",
  textMuted:      "#6E7581",
  placeholder:    "#9CA3AF",

  success:        "#15803D",
  successSoft:    "#DCFCE7",
  warning:        "#B45309",
  warningSoft:    "#FEF3C7",
  danger:         "#DC2626",
  dangerSoft:     "#FEE2E2",

  gradientFrom:   "#00A39B",
  gradientTo:     "#00857E",
} as const;

export type ColorKey = keyof typeof colors;
