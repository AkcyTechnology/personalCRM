import type { ContactForm } from "../screens/AddContactScreen";

export type MessageTone = "samimi" | "profesyonel" | "kisa" | "daha-sicak" | "daha-resmi";

type Family = "yakin" | "aile" | "profesyonel";

const FAMILY_MAP: Record<string, Family> = {
  "Arkadaş": "yakin",
  "Tanıdık": "yakin",
  "Aile": "aile",
  "İş arkadaşı": "profesyonel",
  "Müşteri": "profesyonel",
  "Potansiyel müşteri": "profesyonel",
  "Mentor": "profesyonel",
  "Mentee": "profesyonel",
};

function firstName(fullName: string): string {
  return fullName.trim().split(" ")[0] || fullName.trim();
}

function familyFor(contact: ContactForm): Family {
  return FAMILY_MAP[contact.relationship] ?? "yakin";
}

function notesClause(contact: ContactForm): string {
  const notes = contact.notes?.trim();
  if (!notes) return "";
  const snippet = notes.length > 60 ? notes.slice(0, 60).trim() + "…" : notes;
  return ` ${snippet} ile ilgili nasıl gittiğini merak ediyorum.`;
}

function timeClause(days: number): string {
  if (days >= 9999) return "Uzun zamandır konuşamadık";
  if (days <= 1) return "Bugün aklıma geldin";
  if (days < 14) return `${days} gündür konuşamadık`;
  if (days < 60) return `${Math.round(days / 7)} haftadır konuşamadık`;
  return "Uzun zamandır konuşamadık";
}

function daysSince(iso?: string): number {
  if (!iso) return 9999;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 9999;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function baseMessage(contact: ContactForm, family: Family): string {
  const name = firstName(contact.fullName);
  const days = daysSince(contact.lastContactDate);
  const time = timeClause(days);
  const notes = notesClause(contact);

  if (family === "aile") {
    return `Merhaba, ${time.toLowerCase()}. Nasılsın, bugün seni merak ettim.${notes}`;
  }
  if (family === "profesyonel") {
    return `Merhaba ${name}, umarım iyisinizdir. Geçtiğimiz görüşmemiz aklıma geldi, süreçle ilgili bir gelişme olup olmadığını sormak istedim.${notes}`;
  }
  return `${name}, ${time.toLowerCase()}. Nasılsın, bu ara nasıl gidiyor? Müsait olduğunda kısa bir kahve yapalım mı?${notes}`;
}

function applyTone(message: string, tone: MessageTone, contact: ContactForm, family: Family): string {
  const name = firstName(contact.fullName);

  switch (tone) {
    case "kisa": {
      const firstSentence = message.split(/(?<=[.?!])\s/)[0];
      return firstSentence;
    }
    case "profesyonel":
    case "daha-resmi": {
      if (family === "profesyonel") return message;
      return `Merhaba ${name}, umarım iyisinizdir. Bir süredir görüşemedik, nasıl olduğunuzu merak ettim. Uygun olduğunuzda kısa bir görüşme yapabilir miyiz?`;
    }
    case "daha-sicak": {
      if (family === "aile") return `Canım, ${message.slice(8)}`;
      return `${name}, seni gerçekten özledim! ${message.replace(`${name}, `, "")}`;
    }
    case "samimi":
    default:
      return message;
  }
}

export function generateMessage(contact: ContactForm, tone: MessageTone = "samimi"): string {
  const family = familyFor(contact);
  const base = baseMessage(contact, family);
  return applyTone(base, tone, contact, family);
}

export const TONE_LABELS: Record<MessageTone, string> = {
  "samimi": "Samimi",
  "profesyonel": "Profesyonel",
  "kisa": "Kısa",
  "daha-sicak": "Daha Sıcak",
  "daha-resmi": "Daha Resmi",
};
