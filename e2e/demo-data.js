/** Fictional demo people for store screenshots and promo recordings. */
const iso = (d) => d.toISOString().slice(0, 10);
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const bday = (inDays) => { const d = new Date(); d.setDate(d.getDate() + inDays); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/1992`; };

const PEOPLE = {
  tr: [
    ["Ayşe Demir", "Aile", 2, "Annemin doğum günü planı", bday(3)],
    ["Mehmet Kaya", "Arkadaş", 45, "Yeni işine başladı, nasıl gittiğini sor", ""],
    ["Zeynep Arslan", "İş", 6, "Proje sunumu harikaydı", ""],
    ["Can Yılmaz", "Arkadaş", 12, "Maraton hazırlığı", ""],
    ["Elif Şahin", "Mentor", 70, "Kariyer tavsiyesi için teşekkür et", ""],
    ["Burak Öztürk", "İş", 20, "", ""],
    ["Selin Aydın", "Arkadaş", 1, "Kahve içtik ☕", bday(14)],
    ["Deniz Koç", "Aile", 9, "", ""],
  ],
  en: [
    ["Emma Johnson", "Aile", 2, "Planning mom's birthday", bday(3)],
    ["Liam Carter", "Arkadaş", 45, "Started a new job, ask how it's going", ""],
    ["Olivia Brown", "İş", 6, "Great project demo", ""],
    ["Noah Wilson", "Arkadaş", 12, "Training for the marathon", ""],
    ["Sophia Davis", "Mentor", 70, "Thank her for the career advice", ""],
    ["James Miller", "İş", 20, "", ""],
    ["Ava Thompson", "Arkadaş", 1, "Had coffee ☕", bday(14)],
    ["Lucas Martin", "Aile", 9, "", ""],
  ],
};

function demoContacts(lang) {
  return PEOPLE[lang].map(([fullName, relationship, lastDays, note, birthday], i) => {
    const interactions = [];
    // A steady history so the tree, streak and story have something to show.
    for (let k = 0; k < 5; k++) {
      // Person 4 is a reconnection: a moment this week after a long gap.
      const days = i === 4 ? (k === 0 ? 3 : 110 + k * 20) : lastDays + k * (10 + i * 3);
      interactions.push({ id: `${i}-${k}`, type: ["call", "meeting", "whatsapp", "message", "other"][(i + k) % 5], date: ago(days), note: k === 0 ? note : "" });
    }
    return {
      id: `demo-${i}`, fullName, company: "", jobTitle: "", birthday, relationship, metWhere: "", phone: "+90 555 000 00 0" + i,
      email: "", website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: interactions[0].date,
      reminderFreq: "", notes: note, interactions,
      // The last two were added this month, so the story shows new people.
      createdAt: new Date(Date.now() - (i >= 6 ? 6 : 400) * 86400000).toISOString(),
    };
  });
}

module.exports = { PEOPLE, demoContacts };
