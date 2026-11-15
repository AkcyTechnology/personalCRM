import type { ImageSourcePropType } from "react-native";

/** Painted planets for the Universe map. The sun is you. */
export const SUN: ImageSourcePropType = require("../../assets/universe/sun.webp");
/** Matches the night-sky GIF's darkest tone (tab bar backdrop on the Universe tab). */
export const SPACE_BASE = "#101A4A";
export const SPACE_BG: ImageSourcePropType = require("../../assets/universe/space.gif");

const PLANETS = {
  leafy: require("../../assets/universe/leafy.webp"),
  ringed: require("../../assets/universe/ringed.webp"),
  "ringed-teal": require("../../assets/universe/ringed-teal.webp"),
  "leafy-green": require("../../assets/universe/leafy-green.webp"),
  moon: require("../../assets/universe/moon.webp"),
  "moon-rose": require("../../assets/universe/moon-rose.webp"),
  "ringed-coral": require("../../assets/universe/ringed-coral.webp"),
  "ringed-pink": require("../../assets/universe/ringed-pink.webp"),
  "leafy-teal": require("../../assets/universe/leafy-teal.webp"),
  "moon-mint": require("../../assets/universe/moon-mint.webp"),
} as const satisfies Record<string, ImageSourcePropType>;

export type PlanetKey = keyof typeof PLANETS;

/** Accent per planet, for orbit lines and legend dots. */
export const PLANET_TINT: Record<PlanetKey, string> = {
  leafy: "#4F9BEA",
  ringed: "#A58BEB",
  "ringed-teal": "#5FD3C0",
  "leafy-green": "#6FD36A",
  moon: "#D9CFF2",
  "moon-rose": "#F2BFD3",
  "ringed-coral": "#F09A7A",
  "ringed-pink": "#E58FD0",
  "leafy-teal": "#4FC9D9",
  "moon-mint": "#C9EBD6",
};

/** Every relationship type has its own planet. */
const BY_RELATIONSHIP: Record<string, PlanetKey> = {
  Aile: "leafy",
  Arkadaş: "ringed",
  "İş arkadaşı": "ringed-teal",
  Okul: "leafy-green",
  Mentor: "moon",
  Mentee: "moon-rose",
  Müşteri: "ringed-coral",
  "Potansiyel müşteri": "ringed-pink",
  Tanıdık: "leafy-teal",
  Diğer: "moon-mint",
};

const ORDER = Object.keys(PLANETS) as PlanetKey[];

/**
 * Planets for the relationship types shown together. Known types keep their
 * planet; custom types take the first planet not used yet on this map.
 */
export function assignPlanets(labels: string[]): PlanetKey[] {
  const used = new Set<PlanetKey>();
  const out: (PlanetKey | null)[] = labels.map((l) => {
    const k = BY_RELATIONSHIP[l];
    if (k) used.add(k);
    return k ?? null;
  });
  return out.map((k, i) => {
    if (k) return k;
    const free = ORDER.find((p) => !used.has(p)) ?? ORDER[i % ORDER.length];
    used.add(free);
    return free;
  });
}

export function planetImage(key: PlanetKey): ImageSourcePropType {
  return PLANETS[key];
}
