/// <reference types="node" />
/* eslint-disable security/detect-non-literal-fs-filename -- scans this repo's own src/ tree */
import fs from "fs";
import path from "path";
import ts from "typescript";
import { en } from "../src/i18n/en";
import { setLanguage, t } from "../src/i18n";

// Constants whose string values are shown to the user (and stored in Turkish canonical form).
const CONSTS = new Set([
  "DEFAULT_RELATIONSHIPS", "MET_WHERE", "PRIORITIES", "LAST_CONTACT_OPTIONS", "SUGGESTED_TAGS",
  "CUSTOM_INTERVAL", "INTERVAL_PRESETS", "PRESETS", "CUSTOM", "INTERACTION_TYPES", "STATUS_FILTERS",
  "SORT_OPTIONS", "GOALS", "TONE_LABELS", "PRIVACY", "TERMS", "SLIDES", "BETA_FEATURES", "LATER", "OTHER",
]);
const DISPLAY_PROPS = new Set(["label", "short", "title", "desc", "btn", "body"]);

function collectKeys(): Set<string> {
  const keys = new Set<string>(["Tümü", "Diğer", "İyi", "Dikkat", "Zayıf"]);
  const scan = (file: string) => {
    const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const collect = (n: ts.Node): void => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        const p = n.parent;
        if (ts.isPropertyAssignment(p) && p.name === n) return;
        if (ts.isCallExpression(p) && p.expression.getText() === "require") return;
        if (ts.isPropertyAssignment(p) && p.initializer === n && !DISPLAY_PROPS.has(p.name.getText().replace(/"/g, ""))) {
          const owner = p.parent.parent;
          if (!(ts.isVariableDeclaration(owner) && owner.name.getText() === "TONE_LABELS")) return;
        }
        if (/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(n.text)) keys.add(n.text);
      }
      ts.forEachChild(n, collect);
    };
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "t" && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
        keys.add(n.arguments[0].text);
      }
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && CONSTS.has(n.name.text) && n.initializer) collect(n.initializer);
      ts.forEachChild(n, visit);
    };
    visit(sf);
  };
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(p) && !p.includes(path.join("i18n", "en.ts"))) scan(p);
    }
  };
  walk(path.join(__dirname, "..", "src"));
  return keys;
}

describe("i18n", () => {
  it("has an English translation for every Turkish UI string", () => {
    const missing = [...collectKeys()].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it("keeps placeholders in English translations", () => {
    const names = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort().join();
    const broken = Object.entries(en).filter(([k, v]) =>
      (Array.isArray(v) ? v : [v]).some((s) => names(s).split(",").some((n) => n && !names(k).split(",").includes(n)))
    );
    expect(broken.map(([k]) => k)).toEqual([]);
  });

  it("translates, pluralises and interpolates", () => {
    setLanguage("en");
    expect(t("Kapat")).toBe("Close");
    expect(t("Bu ay {count} kişiyle bağ kurdun", { count: 1 })).toMatch(/1/);
    setLanguage("tr");
    expect(t("Bu ay {count} kişiyle bağ kurdun", { count: 3 })).toBe("Bu ay 3 kişiyle bağ kurdun");
  });
});
