/**
 * Raw 9:16 screen recordings of the app for Reels / TikTok / Shorts editing.
 *
 *   npx expo export --platform web --output-dir dist-web
 *   python3 -m http.server 8765 -d dist-web &
 *   BASE_URL=http://localhost:8765/ node e2e/promo-video.js
 *
 * Writes store/video/{tr,en}-walkthrough.mp4, upscaled to 1080 px wide (needs
 * ffmpeg; otherwise the raw .webm). For the sharpest footage, also screen-record
 * a real phone.
 * Flow: home + bond tree → how the tree grows → "I caught up" + celebration →
 * star glow in the Universe → monthly story → shuffle swipes.
 */
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const ts = require("typescript");
const { demoContacts } = require("./demo-data");

const BASE_URL = process.env.BASE_URL || "http://localhost:8765/";
const OUT = path.join(__dirname, "..", "store", "video");

const EN = (() => {
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "i18n", "en.ts"), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const m = { exports: {} };
  new Function("module", "exports", out.outputText)(m, m.exports);
  return m.exports.en;
})();

async function record(browser, lang) {
  const tr = (k) => (lang === "tr" ? k : EN[k] ?? k);
  const size = { width: 432, height: 936 };
  const tmp = fs.mkdtempSync(path.join(OUT, ".rec-"));
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, locale: lang === "tr" ? "tr-TR" : "en-US", recordVideo: { dir: tmp, size } });
  await ctx.addInitScript(([contacts, settings]) => {
    if (!localStorage.getItem("demo-seeded")) {
      localStorage.setItem("crm_contacts", JSON.stringify(contacts));
      localStorage.setItem("crm_user_settings", JSON.stringify(settings));
      localStorage.setItem("demo-seeded", "1");
    }
  }, [demoContacts(lang), { onboardingComplete: true, userName: lang === "tr" ? "Deniz" : "Sam", acceptedTermsAt: new Date().toISOString(), weeklyGoal: 3, reachOutThresholdDays: 30 }]);
  const page = await ctx.newPage();
  const vis = (loc) => loc.locator("visible=true").first();
  const label = (s) => vis(page.getByLabel(s, { exact: true }));
  const pause = (ms) => page.waitForTimeout(ms);
  const tap = async (loc, after = 1200) => { await loc.click({ timeout: 8000 }); await pause(after); };

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await pause(3000);
  await tap(vis(page.getByLabel(new RegExp(`^${tr("Bağ ağacın: {stage}. {moments} an. {status}").split(":")[0]}:`))), 2800);
  await tap(vis(page.getByText(tr("Tamam"), { exact: true })), 800);
  const done = vis(page.getByLabel(new RegExp(lang === "tr" ? " ile görüştüm$" : "^I caught up with ")));
  await tap(done, 1200);
  await tap(label(tr("Görüşmeyi kaydet")), 3200);
  await tap(label(tr("Evren")), 3000);
  await tap(label(tr("Bu ayın hikâyesi")), 3000);
  await tap(label(tr("Kapat")), 800);
  await tap(label(tr("Ana Sayfa")), 1200);
  await tap(label(tr("Başka birini göster")), 1800);
  for (let i = 0; i < 2; i++) {
    const cx = size.width / 2, cy = size.height * 0.45;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let s = 1; s <= 12; s++) { await page.mouse.move(cx - s * 16, cy + s * 2); await pause(16); }
    await page.mouse.up();
    await pause(1300);
  }
  await pause(800);
  const video = page.video();
  await ctx.close();
  const webm = await video.path();
  const base = path.join(OUT, `${lang}-walkthrough`);
  try {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-vf", "scale=1080:-2:flags=lanczos", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", `${base}.mp4`]);
  } catch {
    fs.copyFileSync(webm, `${base}.webm`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ["tr", "en"]) {
    await record(browser, lang);
    console.log(`${lang}: done`);
  }
  await browser.close();
})();
