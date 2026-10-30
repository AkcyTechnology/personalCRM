/**
 * Store screenshots, generated from the real web build with demo data.
 *
 *   npx expo export --platform web --output-dir dist-web
 *   python3 -m http.server 8765 -d dist-web &
 *   BASE_URL=http://localhost:8765/ node e2e/store-screenshots.js
 *
 * Writes store/screenshots/{tr,en}/{ios,android}/NN-name.png:
 *   ios      1290 × 2796 (iPhone 6.7"/6.9" display)
 *   android  1080 × 1920 (Google Play phone, 9:16)
 * Each image is a captioned frame around a real screen. Demo people are fictional.
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ts = require("typescript");

// The app's English dictionary, to match on-screen text exactly.
const EN = (() => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "i18n", "en.ts"), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const m = { exports: {} };
  new Function("module", "exports", out.outputText)(m, m.exports);
  return m.exports.en;
})();

const BASE_URL = process.env.BASE_URL || "http://localhost:8765/";
const OUT = path.join(__dirname, "..", "store", "screenshots");

const { PEOPLE, demoContacts } = require("./demo-data");

const CAPTIONS = {
  tr: [
    ["home", "Sevdiklerinle bağın büyüsün", "Her görüşme ağacına bir yaprak ekler"],
    ["shuffle", "Bugün kimi hatırlayalım?", "Kaydır, birine merhaba de"],
    ["universe", "Tüm ilişkilerin tek bir evrende", "Kim yakın, kim uzaklaşıyor, bir bakışta"],
    ["story", "Ayın hikâyesi, paylaşmaya hazır", "İsimler sen istemedikçe gizli"],
    ["detail", "Her anı, her notu hatırla", "Bir dahaki sohbete hazır ol"],
    ["privacy", "Verilerin sadece telefonunda", "Şifreli, reklamsız, hesap gerektirmez"],
  ],
  en: [
    ["home", "Watch your bonds grow", "Every catch-up adds a leaf to your tree"],
    ["shuffle", "Who will you think of today?", "Swipe, then say hi"],
    ["universe", "Your people, in one universe", "See who's close and who's drifting"],
    ["story", "Your month, ready to share", "Names stay hidden unless you choose"],
    ["detail", "Remember every moment", "Walk into the next chat prepared"],
    ["privacy", "Private by design", "Encrypted on your phone. No ads, no account"],
  ],
};

async function captureScreens(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, locale: lang === "tr" ? "tr-TR" : "en-US", colorScheme: "light" });
  await ctx.addInitScript(([contacts, settings]) => {
    if (!localStorage.getItem("demo-seeded")) {
      localStorage.setItem("crm_contacts", JSON.stringify(contacts));
      localStorage.setItem("crm_user_settings", JSON.stringify(settings));
      localStorage.setItem("demo-seeded", "1");
    }
  }, [demoContacts(lang), { onboardingComplete: true, userName: lang === "tr" ? "Deniz" : "Sam", acceptedTermsAt: new Date().toISOString(), weeklyGoal: 3, reachOutThresholdDays: 30 }]);
  const page = await ctx.newPage();
  const L = (trText, enText) => (lang === "tr" ? trText : enText);
  const tr = (key) => (lang === "tr" ? key : EN[key] ?? key);
  const vis = (loc) => loc.locator("visible=true").first();
  const label = (s) => vis(page.getByLabel(s, { exact: true }));
  const click = async (loc) => { await loc.click({ timeout: 8000 }); await page.waitForTimeout(1400); };
  const raw = {};
  const grab = async (name) => { raw[name] = await page.screenshot(); };

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await grab("home");
  await click(label(L("Başka birini göster", "Show someone else")));
  await grab("shuffle");
  await click(label(L("Kapat", "Close")));
  await click(label(L("Evren", "Universe")));
  await page.waitForTimeout(1200);
  await grab("universe");
  await click(label(L("Bu ayın hikâyesi", "This month's story")));
  await grab("story");
  await click(label(L("Kapat", "Close")));
  await click(label(L("Kişiler", "People")));
  await click(vis(page.getByLabel(new RegExp(`^${PEOPLE[lang][0][0]}, `))));
  await grab("detail");
  await click(label(L("Geri", "Back")));
  await click(label(L("Profil", "Profile")));
  await click(vis(page.getByText(L("Gizlilik ve Güvenlik", "Privacy & security"), { exact: true })));
  // The web build explains that it is not encrypted and has no app lock; show
  // the exact text the iOS/Android app displays instead.
  await page.evaluate((pairs) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      for (const [from, to] of pairs) if (n.nodeValue === from) n.nodeValue = to;
    }
  }, [
    ["Web sürümünde veriler tarayıcıda saklanır; şifreleme yalnızca iOS ve Android uygulamasında vardır.", "Kişilerin, notların ve ayarların cihazında XChaCha20-Poly1305 ile şifrelenir. Anahtar, cihazın güvenli donanımında (Keychain / Keystore) tutulur ve yedeklere dahil edilmez."],
    ["Cihazında Face ID, parmak izi veya ekran şifresi ayarlı değil", "Açılışta ve 30 sn arka planda kaldıktan sonra Face ID / parmak izi / cihaz şifresi iste"],
  ].map(([a, b]) => [tr(a), tr(b)]));
  await page.waitForTimeout(200);
  await grab("privacy");
  await ctx.close();
  return raw;
}

function frameHtml(shot, title, sub, w, h) {
  const phoneW = Math.round(w * 0.78);
  const radius = Math.round(phoneW * 0.085);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: ${w}px; height: ${h}px; overflow: hidden; font-family: -apple-system, "Inter", "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(120% 70% at 0% 0%, #2EC4B6 0%, #00857E 45%, #0B4F4A 100%); display: flex; flex-direction: column; align-items: center; }
    .glow { position: absolute; width: ${w * 0.9}px; height: ${w * 0.9}px; right: -${w * 0.3}px; top: ${h * 0.12}px; border-radius: 50%;
      background: radial-gradient(circle, #FF8A7088 0%, #FF8A7000 70%); }
    h1 { color: #fff; font-size: ${Math.round(w * 0.072)}px; font-weight: 900; text-align: center; line-height: 1.12; margin-top: ${Math.round(h * 0.06)}px; padding: 0 ${Math.round(w * 0.07)}px; letter-spacing: -0.5px; position: relative; }
    p { color: #E0F7F6; font-size: ${Math.round(w * 0.036)}px; font-weight: 600; text-align: center; margin-top: ${Math.round(h * 0.012)}px; padding: 0 ${Math.round(w * 0.08)}px; position: relative; }
    .phone { position: relative; margin-top: ${Math.round(h * 0.035)}px; width: ${phoneW}px; border-radius: ${radius}px; overflow: hidden;
      border: ${Math.round(w * 0.012)}px solid #0B1215; box-shadow: 0 ${Math.round(w * 0.03)}px ${Math.round(w * 0.08)}px rgba(0,0,0,0.35); }
    .phone img { display: block; width: 100%; }
  </style></head><body><div class="glow"></div><h1>${title}</h1><p>${sub}</p>
  <div class="phone"><img src="data:image/png;base64,${shot.toString("base64")}"></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ["tr", "en"]) {
    const raw = await captureScreens(browser, lang);
    for (const [platform, w, h] of [["ios", 1290, 2796], ["android", 1080, 1920]]) {
      const dir = path.join(OUT, lang, platform);
      fs.mkdirSync(dir, { recursive: true });
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      for (const [i, [name, title, sub]] of CAPTIONS[lang].entries()) {
        await page.setContent(frameHtml(raw[name], title, sub, w, h));
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, "0")}-${name}.png`) });
      }
      await page.close();
    }
    console.log(`${lang}: done`);
  }
  await browser.close();
})();
