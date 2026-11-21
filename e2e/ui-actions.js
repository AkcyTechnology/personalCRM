/* Clicks every new Home and Profile action on seeded data. Run: NODE_PATH=$(npm root -g) BASE_URL=http://localhost:8765/ node e2e/ui-actions.js */
const { chromium } = require("playwright");

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const base = { company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "", phone: "", email: "", website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "", reminderFreq: "", notes: "" };
const P = (id, fullName, relationship, avatarId, moments, extra = {}) => ({ ...base, id, fullName, relationship, avatarId, lastContactDate: moments[0] != null ? iso(moments[0][0]) : "", interactions: moments.map(([d, type, note], k) => ({ id: id + k, type, date: iso(d), note })), createdAt: new Date(Date.now() - 300 * 864e5).toISOString(), ...extra });
const dow = (new Date().getDay() + 6) % 7;
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const people = [
  P("1", "Ayşe Demir", "Arkadaş", "a01", [[Math.min(1, dow), "meeting", "Kahve"], [40, "call"]], { phone: "0532 111 22 33", reminders: [{ id: "r1", date: plus(2), time: "18:00", note: "Yeni işini sor" }] }),
  P("2", "Berrin Kaya", "Arkadaş", "a17", [[153, "meeting", "Akşam yemeği"]]),
  P("3", "Ceren Arslan", "İş arkadaşı", "a09", [[20, "call"]]),
  P("4", "Mert Şahin", "Aile", "a02", [[0, "call"], [9, "message"]]),
  P("5", "Elif Öz", "Okul", "a13", [[60, "meeting", "Yürüyüş"]], { birthday: `${plus(3).slice(8, 10)}/${plus(3).slice(5, 7)}/1994` }),
  P("6", "Can Yılmaz", "Arkadaş", "a06", []),
  P("7", "Selin Ak", "Aile", "a19", [[3, "whatsapp"]]),
];
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  await ctx.addInitScript(([c]) => { if (!localStorage.getItem("s")) { localStorage.setItem("crm_contacts", JSON.stringify(c)); localStorage.setItem("crm_user_settings", JSON.stringify({ onboardingComplete: true, userName: "Deniz Kaya", goals: ["personal"], analyticsAsked: true })); localStorage.setItem("s", "1"); } }, [people]);
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 120)); });
  p.on("dialog", (d) => d.accept());
  await p.goto(process.env.BASE_URL || "http://localhost:8765/", { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  const vis = (l) => l.locator("visible=true").first();
  const txt = (s) => vis(p.getByText(s, { exact: true }));
  const lab = (s) => vis(p.getByLabel(s, { exact: true }));
  const close = async () => { const l = p.getByLabel("Kapat", { exact: true }).locator("visible=true"); if (await l.count()) await l.last().click({ timeout: 3000 }); else await p.getByText("Kapat", { exact: true }).locator("visible=true").last().click({ timeout: 3000 }); };
  const results = []; p.setDefaultTimeout(6000);
  const step = async (name, fn) => { try { await fn(); await p.waitForTimeout(400); results.push("PASS " + name); } catch (e) { results.push("FAIL " + name + " — " + e.message.split("\n").filter((l) => /intercept|waiting for|Error|not stored|moment/.test(l)).slice(0, 3).join(" / ")); } };
  const back = async () => { const byLabel = p.getByLabel("Geri", { exact: true }).locator("visible=true"); const byText = p.getByText("Geri", { exact: true }).locator("visible=true"); if (await byLabel.count()) await byLabel.first().click(); else if (await byText.count()) await byText.first().click(); else throw new Error("no back button"); await p.waitForTimeout(600); };

  await step("home: goal tile sheet", async () => { await vis(p.getByLabel(/^Haftalık hedef: /)).click(); await txt("Bu hafta görüştüğün farklı kişiler").waitFor({ timeout: 3000 }); await close(); });
  await step("home: streak tile sheet", async () => { await vis(p.getByLabel(/^Görüşme serisi: /)).click(); await txt("En uzun serin: 2 hafta").waitFor({ timeout: 3000 }).catch(() => txt("Bu hafta görüşme kaydettin").waitFor({ timeout: 2000 })); await close(); });
  await step("home: tree sheet", async () => { await vis(p.getByLabel(/^Bağ ağacın: /)).click(); await txt("Bağ ağacın nasıl büyür?").waitFor({ timeout: 3000 }); await txt("Tamam").click(); });
  await step("home: spark chip opens composer", async () => { await vis(p.getByLabel(/Berrin/)).click(); await txt("Mesaj hazırla").waitFor({ timeout: 3000 }); await close(); });
  await step("home: week strip selects a day and filters", async () => { await vis(p.getByRole("tab").filter({ hasText: "23" })).click(); await p.waitForTimeout(300); });
  await step("home: Plan ekle → person → save reminder → appears", async () => {
    await vis(p.getByRole("button", { name: "Plan ekle" })).click();
    await txt("Kiminle görüşmeyi planlıyorsun?").waitFor({ timeout: 3000 });
    await lab("Kişi ara").fill("Selin");
    await p.getByText("Selin Ak", { exact: true }).locator("visible=true").last().click();
    await txt("Selin Ak için hatırlatıcı").waitFor({ timeout: 3000 });
    await lab("Hatırlatıcı notu").fill("Sinema");
    await txt("Hatırlatıcıyı kaydet").click();
    await p.waitForTimeout(800);
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem("crm_contacts")).find((c) => c.id === "7").reminders);
    if (!stored || !stored.some((r) => r.note === "Sinema")) throw new Error("reminder not stored");
    const interactions = await p.evaluate(() => JSON.parse(localStorage.getItem("crm_contacts")).find((c) => c.id === "7").interactions.length);
    if (interactions !== 1) throw new Error("plan created a logged moment");
  });
  await step("home: Yeniden görüş avatar → person", async () => { await vis(p.getByLabel(/^Berrin Kaya, /)).click(); await txt("Berrin Kaya").waitFor({ timeout: 3000 }); await back(); });
  await step("home: Son görüşmeler row → person", async () => { await vis(p.getByLabel(/^Mert Şahin, Bugün/)).click(); await p.waitForTimeout(500); await back(); });
  await step("home: Yeniden görüş Tümü → People due", async () => { await vis(p.getByRole("button", { name: "Tümü" })).click(); await p.waitForTimeout(600); await back(); });

  await step("profile: open", async () => { await p.getByRole("tab", { name: "Profil" }).first().click(); await txt("Bağlantıların").waitFor({ timeout: 3000 }); });
  await step("profile: group card → People filtered", async () => { await vis(p.getByLabel("Aile: 2 kişi")).click(); await txt("2 kişi gösteriliyor").waitFor({ timeout: 3000 }); await back(); });
  await step("profile: Görüşme planla opens picker", async () => { await vis(p.getByRole("button", { name: "Görüşme planla" })).click(); await txt("Kiminle görüşmeyi planlıyorsun?").waitFor({ timeout: 3000 }); await close(); });
  await step("profile: Mesaj yaz → hello panel", async () => { await txt("Mesaj yaz").click(); await txt("Mesajını hazırla").waitFor({ timeout: 3000 }); await close(); });
  await step("profile: Aktivite ayrıntıları", async () => { await vis(p.getByRole("button", { name: /Aktivite ayrıntıları/ })).click(); await p.waitForTimeout(300); await close(); });
  await step("profile: analysis expand", async () => { await vis(p.getByText(/^Tümünü göster \(\d+\)$/)).click(); await txt("Daha az göster").waitFor({ timeout: 3000 }); });
  await step("profile: badge sheet", async () => { await vis(p.getByLabel(/^Tohum, /)).click(); await p.waitForTimeout(300); await close(); });
  await step("profile: upcoming row → person", async () => { await vis(p.getByLabel(/^Bugün, /)).click(); await p.waitForTimeout(500); await back(); });
  await step("profile: settings row", async () => { await p.getByRole("tab", { name: "Profil" }).first().click().catch(() => {}); await lab("Hesap ayarları").click(); await txt("Görünüm").waitFor({ timeout: 3000 }); await back(); });
  await step("profile: edit button", async () => { await lab("Profili düzenle").click(); await txt("Profil Ayarları").waitFor({ timeout: 3000 }); await back(); });
  console.log(results.join("\n")); console.log("errors:", errs.length ? errs.join(" | ") : "none");
  if (errs.length || results.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
  await b.close();
})();
