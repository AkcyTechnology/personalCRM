/**
 * Generates docs/privacy.html and docs/terms.html (Turkish + English) from the
 * same text the app shows (src/screens/LegalScreen.tsx + src/i18n/en.ts), so
 * the public store URL never drifts from the in-app policy.
 *
 *   node scripts/build-legal-pages.js
 *
 * Host the docs/ folder with GitHub Pages and use
 * https://<user>.github.io/<repo>/privacy.html as the store privacy URL.
 */
/* eslint-disable @typescript-eslint/no-require-imports, security/detect-non-literal-fs-filename, security/detect-object-injection -- build script over this repo's own files */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

function evalTs(file) {
  const out = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const m = { exports: {} };
  new Function("module", "exports", "require", out.outputText)(m, m.exports, () => ({}));
  return m.exports;
}

const { en } = evalTs("src/i18n/en.ts");

function sections(name) {
  const sf = ts.createSourceFile("LegalScreen.tsx", read("src/screens/LegalScreen.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = null;
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
      found = n.initializer.elements.map((el) => {
        const o = {};
        el.properties.forEach((p) => { o[p.name.getText()] = p.initializer.text; });
        return o;
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!found) throw new Error(`${name} not found`);
  return found;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function para(s) {
  let html = "";
  let inList = false;
  for (const line of esc(s).split("\n")) {
    const item = line.startsWith("•");
    if (item && !inList) html += "<ul>";
    if (!item && inList) html += "</ul>";
    inList = item;
    html += item ? `<li>${line.slice(1).trim()}</li>` : `<p>${line}</p>`;
  }
  return inList ? html + "</ul>" : html;
}

const updated = (() => {
  const m = read("src/screens/LegalScreen.tsx").match(/UPDATED = new Date\((\d+), (\d+), (\d+)\)/);
  return m ? `${m[3].padStart(2, "0")}.${String(Number(m[2]) + 1).padStart(2, "0")}.${m[1]}` : "";
})();

function page(kind, list) {
  const title = { privacy: ["Gizlilik Politikası", "Privacy Policy"], terms: ["Kullanım Şartları", "Terms of Use"] }[kind];
  const block = (lang, items, h) => `
  <section lang="${lang}" id="${lang}">
    <h1>${esc(h)}</h1>
    ${items.map((s) => `<h2>${esc(s.title)}</h2>\n${para(s.body)}`).join("\n    ")}
  </section>`;
  const tr = list;
  const enList = list.map((s) => ({ title: en[s.title] || s.title, body: en[s.body] || s.body }));
  const missing = list.filter((s) => !en[s.title] || !en[s.body]).length;
  if (missing) throw new Error(`${kind}: ${missing} section(s) missing an English translation`);
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connectly — ${title[1]}</title>
<style>
  :root { color-scheme: light dark; --bg:#fff; --text:#111827; --sub:#4B5563; --accent:#00857E; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0E1416; --text:#F1F5F4; --sub:#A9B4B8; --accent:#2EC4B6; } }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.6 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
  nav a { color: var(--accent); font-weight: 700; margin-right: 16px; }
  h1 { font-size: 28px; margin: 32px 0 4px; } h2 { font-size: 18px; margin: 24px 0 4px; }
  p, li { color: var(--sub); } .updated { font-size: 14px; color: var(--sub); }
  hr { border: 0; border-top: 1px solid #8884; margin: 48px 0; }
</style>
</head>
<body><main>
  <nav><a href="#tr">Türkçe</a><a href="#en">English</a></nav>
  <p class="updated">Connectly · Son güncelleme / Last updated: ${updated}</p>
  ${block("tr", tr, title[0])}
  <hr>
  ${block("en", enList, title[1])}
</main></body>
</html>
`;
}

fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/privacy.html"), page("privacy", sections("PRIVACY")));
fs.writeFileSync(path.join(root, "docs/terms.html"), page("terms", sections("TERMS")));
console.log("Wrote docs/privacy.html and docs/terms.html");
