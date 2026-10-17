export const colors = {
  primary:        "#00B5AC",
  primarySoft:    "#E0F7F6",
  primaryLight:   "#E6F8F6",
  primaryMid:     "#00B5AC99",

  accent:         "#7C3AED",
  accentSoft:     "#F3F0FF",
  accentMid:      "#7C3AED55",

  secondary:      "#EC4899",
  secondarySoft:  "#FCE7F3",

  bg:             "#FFFFFF",
  card:           "#F8FAFB",
  border:         "#E5E7EB",
  borderLight:    "#F3F4F6",

  text:           "#111827",
  textSub:        "#6B7280",
  textMuted:      "#9CA3AF",

  success:        "#16A34A",
  successSoft:    "#DCFCE7",
  warning:        "#D97706",
  warningSoft:    "#FEF3C7",
  danger:         "#DC2626",
  dangerSoft:     "#FEE2E2",

  gradientFrom:   "#7C3AED",
  gradientTo:     "#00B5AC",
} as const;

export type ColorKey = keyof typeof colors;
