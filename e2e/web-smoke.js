/**
 * End-to-end smoke test against the static web build.
 *
 *   npx expo export --platform web --output-dir dist-web
 *   python3 -m http.server 8765 -d dist-web &
 *   npm i -D playwright   (or use a globally installed one)
 *   BASE_URL=http://localhost:8765 node e2e/web-smoke.js
 *
 * Exits non-zero if any step fails. Screenshots go to e2e/screenshots/.
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:8765/";
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const results = [];
  const errors = [];

  async function run(viewport, label) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (e) => errors.push(`[${label}] pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[${label}] console: ${m.text().slice(0, 200)}`); });
    // Web confirm dialogs: decline "Önce yedek al", accept everything else.
    page.on("dialog", (d) => (d.message().includes("Önce yedek al") ? d.dismiss() : d.accept()));

    const vis = (loc) => loc.locator("visible=true").first();
    const text = (s, exact = true) => vis(page.getByText(s, { exact }));
    const label_ = (s) => vis(page.getByLabel(s, { exact: true }));
    const click = async (loc) => { await loc.click({ timeout: 6000 }); await page.waitForTimeout(700); };
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${label}-${n}.png`) });
    const step = async (name, fn) => {
      try { await fn(); results.push({ name: `[${label}] ${name}`, ok: true }); }
      catch (e) { results.push({ name: `[${label}] ${name}`, ok: false, err: e.message.split("\n")[0] }); await shot(`FAIL-${name.replace(/\W+/g, "_")}`); }
    };

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    await step("onboarding: skip intro", () => click(text("Atla")));
    await step("legal: terms page opens", async () => { await click(text("Kullanım Şartları")); await text("Garanti reddi").waitFor({ timeout: 4000 }); await click(text("Geri")); });
    await step("onboarding: start", () => click(text("Başlayalım")));
    await step("onboarding: welcome", () => click(text("Devam et")));
    await step("onboarding: profile", async () => { await vis(page.getByPlaceholder("Ad Soyad")).fill("Test Kullanıcı"); await click(text("Devam")); });
    await step("onboarding: goals", async () => { await click(text("Networking yapmak")); await click(vis(page.getByText(/^Devam/))); });
    await step("onboarding: finish", () => click(text("Uygulamaya geç")));
    await step("home: empty state", () => text("İlk kişini ekle").waitFor({ timeout: 4000 }));
    await shot("01-home-empty");

    await step("add: open", () => click(label_("Yeni kişi ekle")));
    await step("add: validation on empty save", async () => { await click(text("Kişiyi Kaydet")); await text("Ad Soyad zorunlu.").waitFor({ timeout: 3000 }); });
    await shot("02-add-validation");
    await step("add: fill essentials", async () => {
      await vis(page.getByPlaceholder("Ahmet Yılmaz", { exact: true })).fill("Ahmet Yılmaz");
      await vis(page.getByPlaceholder("+90 5xx xxx xx xx")).fill("0532 111 22 33");
      await click(text("Arkadaş"));
      await click(text("1 ay önce"));
    });
    await step("add: save", () => click(text("Kişiyi Kaydet")));
    await step("home: dynamic due count", () => text("Bugün 1 kişi seni bekliyor").waitFor({ timeout: 4000 }));
    await step("home: bell badge label", () => label_("Hatırlatıcılar, 1 bekleyen").waitFor({ timeout: 3000 }));
    await shot("03-home-due");

    await step("log: Görüştüm from Today card", async () => {
      await click(label_("Ahmet Yılmaz ile görüştüm"));
      await click(text("Arama"));
      await label_("Görüşme notu").fill("Kahve içtik");
      await click(label_("Görüşmeyi kaydet"));
    });
    await step("log: undo toast shown", () => text("Geri al").waitFor({ timeout: 3000 }));
    await shot("04-undo-toast");
    await step("log: undo restores due state", async () => { await click(text("Geri al")); await text("Bugün 1 kişi seni bekliyor").waitFor({ timeout: 4000 }); });
    await step("log: log again", async () => {
      await click(label_("Ahmet Yılmaz ile görüştüm"));
      await label_("Görüşme notu").fill("Kahve içtik");
      await click(label_("Görüşmeyi kaydet"));
      await text("Bugün her şey yolunda ✓").waitFor({ timeout: 4000 });
    });
    await shot("05-home-done");

    await step("add: duplicate warning then save", async () => {
      await click(label_("Yeni kişi ekle"));
      await vis(page.getByPlaceholder("Ahmet Yılmaz", { exact: true })).fill("Ahmet Yılmaz");
      await click(text("Mentor"));
      await click(text("Kişiyi Kaydet"));
      await page.waitForTimeout(800);
    });
    await step("people: two contacts listed", async () => { await click(label_("Kişiler")); await text("2 kişi").waitFor({ timeout: 4000 }); });
    await step("people: status filter Bekleyen", async () => { await click(text("Bekleyen")); await text("Bekleyen kimse yok").waitFor({ timeout: 3000 }); await click(text("Tümü")); });
    await step("people: search", async () => { await label_("Kişi ara").fill("zzz"); await text("Sonuç yok").waitFor({ timeout: 3000 }); await click(label_("Aramayı temizle")); });
    await shot("06-people");

    await step("detail: history shows note", async () => {
      await click(vis(page.getByLabel(/^Ahmet Yılmaz, Arkadaş/)));
      await vis(page.getByText(/Kahve içtik/)).waitFor({ timeout: 4000 });
    });
    await shot("07-detail");
    await step("detail: back", () => click(label_("Geri")));

    await step("detail: delete + undo", async () => {
      await click(vis(page.getByLabel(/^Ahmet Yılmaz, Mentor/)));
      await click(text("Düzenle"));
      await click(text("Sil"));
      await click(text("Evet, sil"));
      await text("Geri al").waitFor({ timeout: 3000 });
      await click(text("Geri al"));
      await text("2 kişi").waitFor({ timeout: 4000 });
    });

    await step("privacy: open", async () => { await click(label_("Profil")); await click(text("Gizlilik ve Güvenlik")); await text("Tüm verileri sil").waitFor({ timeout: 3000 }); });
    await shot("08-privacy");
    await step("privacy: policy page", async () => { await click(text("Gizlilik Politikası")); await text("Rehber erişimi").waitFor({ timeout: 3000 }); await click(text("Geri")); });
    await step("privacy: wipe all data", async () => {
      await click(text("Tüm verileri sil"));
      await page.waitForTimeout(1500);
      const keys = await page.evaluate(() => Object.keys(localStorage));
      if (keys.includes("crm_contacts")) throw new Error("contacts still stored: " + keys.join(","));
      await text("Atla").waitFor({ timeout: 4000 });
    });
    await page.close();
  }

  await run({ width: 390, height: 844 }, "iphone14");

  // Small-screen layout check (iPhone SE 1st gen size): home must render without errors.
  const small = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await small.goto(BASE_URL, { waitUntil: "networkidle" });
  await small.waitForTimeout(1200);
  const overflow = await small.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  results.push({ name: "[se] no horizontal overflow on first screen", ok: !overflow });
  await small.screenshot({ path: path.join(OUT, "se-01-first.png") });
  await small.close();

  await browser.close();

  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.err ? "  — " + r.err : ""}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} steps passed`);
  if (errors.length) console.log("Runtime errors:\n" + errors.join("\n"));
  process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1);
})();
