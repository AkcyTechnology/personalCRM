import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ContactForm } from "../screens/AddContactScreen";

const KEY = "crm_contacts";

// ─── Seed verisi (ilk kurulumda gösterilir) ───────────────────────────────────
const SEED: ContactForm[] = [
  {
    fullName: "Zeynep Kaya", company: "Figma", jobTitle: "Product Designer",
    birthday: "12/04/1995", relationship: "Arkadaş", metWhere: "Etkinlik / Konferans",
    phone: "+90 532 111 22 33", email: "zeynep@figma.com",
    website: "", instagram: "", city: "İstanbul",
    socials: [{ platform: "LinkedIn", handle: "zeynepkaya" }],
    tags: "tasarım, mentor", priority: "Yüksek", notes: "UX konferansında tanıştık.",
    lastContactDate: "2026-05-20", reminderFreq: "",
  },
  {
    fullName: "Mert Demir", company: "Startup X", jobTitle: "CTO",
    birthday: "05/09/1990", relationship: "İş arkadaşı", metWhere: "İş ortamı",
    phone: "+90 544 222 33 44", email: "mert@startupx.io",
    website: "", instagram: "", city: "İstanbul",
    socials: [{ platform: "GitHub", handle: "mertdemir" }],
    tags: "teknoloji, yatırımcı", priority: "Orta", notes: "Bir proje için konuştuk.",
    lastContactDate: "2026-05-01", reminderFreq: "",
  },
  {
    fullName: "Seda Arslan", company: "Google", jobTitle: "SWE",
    birthday: "20/01/1993", relationship: "Mentor", metWhere: "LinkedIn",
    phone: "", email: "seda@google.com",
    website: "", instagram: "", city: "Ankara",
    socials: [{ platform: "LinkedIn", handle: "sedaarslan" }],
    tags: "yazılım", priority: "Yüksek", notes: "",
    lastContactDate: "2026-04-10", reminderFreq: "",
  },
  {
    fullName: "Can Öztürk", company: "Üniversite", jobTitle: "Öğrenci",
    birthday: "15/07/2001", relationship: "Tanıdık", metWhere: "Okul / Üniversite",
    phone: "+90 501 333 44 55", email: "can@uni.edu",
    website: "", instagram: "", city: "İzmir",
    socials: [], tags: "", priority: "Normal", notes: "Ortak dersler aldık.",
    lastContactDate: "2026-05-30", reminderFreq: "",
  },
  {
    fullName: "Ayşe Yıldız", company: "Freelance", jobTitle: "Copywriter",
    birthday: "08/11/1988", relationship: "Müşteri", metWhere: "Ortak arkadaş",
    phone: "+90 533 444 55 66", email: "ayse@mail.com",
    website: "", instagram: "ayse.yildiz", city: "İstanbul",
    socials: [{ platform: "Instagram", handle: "ayse.yildiz" }],
    tags: "pazarlama", priority: "Normal", notes: "",
    lastContactDate: "2026-05-10", reminderFreq: "",
  },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export async function loadContacts(): Promise<ContactForm[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) {
      // İlk açılış: seed'e id ata, yaz ve döndür
      const seeded = SEED.map((c) => ({ ...c, id: c.id ?? generateId() }));
      await AsyncStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as ContactForm[];
    // Eski kayıtlarda id eksikse (seçim/silme/sıralama için gerekli) tamamla.
    if (parsed.some((c) => !c.id)) {
      const migrated = parsed.map((c) => ({ ...c, id: c.id ?? generateId() }));
      await saveContacts(migrated);
      return migrated;
    }
    return parsed;
  } catch {
    return SEED;
  }
}

export async function saveContacts(contacts: ContactForm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(contacts));
  } catch {
    // sessiz hata — UI'ı bloklama
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function addContact(contact: ContactForm): Promise<ContactForm[]> {
  const current = await loadContacts();
  const now = new Date().toISOString();
  const prepared: ContactForm = {
    ...contact,
    id: contact.id ?? generateId(),
    createdAt: contact.createdAt ?? now,
    updatedAt: contact.updatedAt ?? now,
  };
  const updated = [...current, prepared];
  await saveContacts(updated);
  return updated;
}

export async function deleteContact(id: string): Promise<ContactForm[]> {
  const current = await loadContacts();
  const updated = current.filter((c) => c.id !== id);
  await saveContacts(updated);
  return updated;
}

export async function deleteContacts(ids: string[]): Promise<ContactForm[]> {
  const idSet = new Set(ids);
  const current = await loadContacts();
  const updated = current.filter((c) => !c.id || !idSet.has(c.id));
  await saveContacts(updated);
  return updated;
}

export async function reorderContacts(orderedIds: string[]): Promise<ContactForm[]> {
  const current = await loadContacts();
  const orderIndex = new Map(orderedIds.map((id, i) => [id, i]));
  const updated = current.map((c) =>
    c.id && orderIndex.has(c.id) ? { ...c, order: orderIndex.get(c.id) } : c
  );
  await saveContacts(updated);
  return updated;
}
