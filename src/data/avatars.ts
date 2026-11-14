import type { ImageSourcePropType } from "react-native";

/**
 * Illustrated avatars a person can be given when there is no photo. The id is
 * what gets stored on the contact (`avatarId`), so files can be redrawn
 * without touching user data. Never chosen automatically from a name.
 */
export type AvatarOption = { id: string; source: ImageSourcePropType; label: string };

export const AVATARS: AvatarOption[] = [
  { id: "a01", source: require("../../assets/avatars/avatar-01.png"), label: "Uzun dalgalı koyu saçlı, şeftali arka plan" },
  { id: "a02", source: require("../../assets/avatars/avatar-02.png"), label: "Kıvırcık saçlı ve sakallı, turuncu arka plan" },
  { id: "a03", source: require("../../assets/avatars/avatar-03.png"), label: "Kızıl topuz saçlı, sarı arka plan" },
  { id: "a04", source: require("../../assets/avatars/avatar-04.png"), label: "Kel, sakallı ve gözlüklü, adaçayı arka plan" },
  { id: "a05", source: require("../../assets/avatars/avatar-05.png"), label: "Uzun siyah saçlı ve gözlüklü, mint arka plan" },
  { id: "a06", source: require("../../assets/avatars/avatar-06.png"), label: "Kısa siyah saçlı, kapüşonlu, açık mavi arka plan" },
  { id: "a07", source: require("../../assets/avatars/avatar-07.png"), label: "Gür kıvırcık siyah saçlı, mavi arka plan" },
  { id: "a08", source: require("../../assets/avatars/avatar-08.png"), label: "Kır saçlı ve sakallı, krem arka plan" },
  { id: "a09", source: require("../../assets/avatars/avatar-09.png"), label: "Siyah topuz saçlı, pembe arka plan" },
  { id: "a10", source: require("../../assets/avatars/avatar-10.png"), label: "Kahverengi saçlı ve gözlüklü, mint arka plan" },
  { id: "a11", source: require("../../assets/avatars/avatar-11.png"), label: "Kısa sarı dalgalı saçlı, mercan arka plan" },
  { id: "a12", source: require("../../assets/avatars/avatar-12.png"), label: "Kıvırcık saçlı ve sakallı, adaçayı arka plan" },
  { id: "a13", source: require("../../assets/avatars/avatar-13.png"), label: "Başörtülü, mint arka plan" },
  { id: "a14", source: require("../../assets/avatars/avatar-14.png"), label: "Siyah saçlı, şeftali arka plan" },
  { id: "a15", source: require("../../assets/avatars/avatar-15.png"), label: "Örgü saçlı, açık mavi arka plan" },
  { id: "a16", source: require("../../assets/avatars/avatar-16.png"), label: "Kızıl kısa saçlı, sarı arka plan" },
  { id: "a17", source: require("../../assets/avatars/avatar-17.png"), label: "Kahküllü dalgalı saçlı, mint arka plan" },
  { id: "a18", source: require("../../assets/avatars/avatar-18.png"), label: "Kısa kıvırcık saçlı, sakallı ve gözlüklü, krem arka plan" },
  { id: "a19", source: require("../../assets/avatars/avatar-19.png"), label: "Uzun koyu saçlı, adaçayı arka plan" },
  { id: "a20", source: require("../../assets/avatars/avatar-20.png"), label: "Kıvırcık saçlı ve hafif sakallı, mavi arka plan" },
];

export function avatarSource(id?: string): ImageSourcePropType | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id)?.source ?? null;
}

export function isKnownAvatar(id?: string): boolean {
  return !!id && AVATARS.some((a) => a.id === id);
}
