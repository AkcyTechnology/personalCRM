/**
 * Usage purposes chosen in onboarding and on Profile. `key` is what is stored
 * in settings and must never change; `label`/`short` are display text only.
 * Icons are drawn by components/GoalIcon.
 */
export const GOALS = [
  { key: "personal",     label: "Kişisel ilişkilerimi takip etmek",            short: "Kişisel ilişkiler" },
  { key: "professional", label: "İş bağlantılarımı takip etmek",               short: "İş bağlantıları" },
  { key: "networking",   label: "Yeni bağlantılar kurmak",                     short: "Yeni bağlantılar" },
  { key: "occasions",    label: "Özel günleri ve hatırlatıcıları takip etmek", short: "Özel günler" },
] as const;
