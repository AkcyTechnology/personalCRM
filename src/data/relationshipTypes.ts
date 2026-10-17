import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "crm_custom_relationships";

export const DEFAULT_RELATIONSHIPS = [
  "Müşteri", "Tanıdık", "İş arkadaşı", "Mentor",
  "Arkadaş", "Aile", "Potansiyel müşteri", "Mentee",
];

export async function loadCustomRelationships(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveCustomRelationships(list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export async function addCustomRelationship(label: string): Promise<string[]> {
  const trimmed = label.trim();
  const current = await loadCustomRelationships();
  const exists =
    !trimmed ||
    [...DEFAULT_RELATIONSHIPS, ...current].some(
      (r) => r.toLowerCase() === trimmed.toLowerCase()
    );
  const updated = exists ? current : [...current, trimmed];
  if (!exists) await saveCustomRelationships(updated);
  return updated;
}

export async function removeCustomRelationship(label: string): Promise<string[]> {
  const current = await loadCustomRelationships();
  const updated = current.filter((r) => r !== label);
  await saveCustomRelationships(updated);
  return updated;
}
