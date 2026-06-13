import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ContactForm } from "../screens/AddContactScreen";

const KEY = "crm_contacts";

// ─── Seed verisi (ilk kurulumda gösterilir) ───────────────────────────────────
const SEED: ContactForm[] = [
  {
    fullName: "Zeynep Kaya", company: "Figma", jobTitle: "Product Designer",
    birthday: "12/04/1995", relationship: "Arkadaş", metWhere: "Etkinlik / Konferans",
    phone: "+90 532 111 22 33", email: "zeynep@figma.com",
    socials: [{ platform: "LinkedIn", handle: "zeynepkaya" }],
    tags: "tasarım, mentor", priority: "Yüksek", notes: "UX konferansında tanıştık.",
    lastContactDate: "2026-05-20",
  },
  {
    fullName: "Mert Demir", company: "Startup X", jobTitle: "CTO",
    birthday: "05/09/1990", relationship: "İş arkadaşı", metWhere: "İş ortamı",
    phone: "+90 544 222 33 44", email: "mert@startupx.io",
    socials: [{ platform: "GitHub", handle: "mertdemir" }],
    tags: "teknoloji, yatırımcı", priority: "Orta", notes: "Bir proje için konuştuk.",
    lastContactDate: "2026-05-01",
  },
  {
    fullName: "Seda Arslan", company: "Google", jobTitle: "SWE",
    birthday: "20/01/1993", relationship: "Mentor", metWhere: "LinkedIn",
    phone: "", email: "seda@google.com",
    socials: [{ platform: "LinkedIn", handle: "sedaarslan" }],
    tags: "yazılım", priority: "Yüksek", notes: "",
    lastContactDate: "2026-04-10",
  },
  {
    fullName: "Can Öztürk", company: "Üniversite", jobTitle: "Öğrenci",
    birthday: "15/07/2001", relationship: "Tanıdık", metWhere: "Okul / Üniversite",
    phone: "+90 501 333 44 55", email: "can@uni.edu",
    socials: [], tags: "", priority: "Normal", notes: "Ortak dersler aldık.",
    lastContactDate: "2026-05-30",
  },
  {
    fullName: "Ayşe Yıldız", company: "Freelance", jobTitle: "Copywriter",
    birthday: "08/11/1988", relationship: "Müşteri", metWhere: "Ortak arkadaş",
    phone: "+90 533 444 55 66", email: "ayse@mail.com",
    socials: [{ platform: "Instagram", handle: "ayse.yildiz" }],
    tags: "pazarlama", priority: "Normal", notes: "",
    lastContactDate: "2026-05-10",
  },
];

// ─── API ──────────────────────────────────────────────────────────────────────

export async function loadContacts(): Promise<ContactForm[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) {
      // İlk açılış: seed'i yaz ve döndür
      await AsyncStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as ContactForm[];
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

export async function addContact(contact: ContactForm): Promise<ContactForm[]> {
  const current = await loadContacts();
  const updated = [...current, contact];
  await saveContacts(updated);
  return updated;
}

export async function deleteContact(index: number): Promise<ContactForm[]> {
  const current = await loadContacts();
  const updated = current.filter((_, i) => i !== index);
  await saveContacts(updated);
  return updated;
}
