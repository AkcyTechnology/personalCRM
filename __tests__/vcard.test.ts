import jsQR from "jsqr";
import { buildVCard, linkedinUrl, vcardEscape, vcardPhone } from "../src/utils/vcard";
import { qrMatrix } from "../src/components/QrCode";

/** Renders the QR matrix to pixels (with a quiet zone) and decodes it back. */
function scan(text: string): string | null {
  const m = qrMatrix(text);
  const n = m.length, q = 4, s = 4, w = (n + 2 * q) * s;
  const px = new Uint8ClampedArray(w * w * 4).fill(255);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c])
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = (((r + q) * s + y) * w + (c + q) * s + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = 0;
    }
  const out = jsQR(px, w, w);
  return out ? Buffer.from(out.binaryData).toString("utf8") : null;
}

describe("business card QR", () => {
  const card = {
    fullName: "Tuğçe Şahin",
    title: "Ürün Yöneticisi",
    company: "Işık Yazılım; A.Ş.",
    email: "tugce@ornek.com",
    phone: "+90 532 111 22 33",
    website: "ornek.com",
    linkedin: "tugce-sahin",
    address: "Bağdat Cd. 12",
    city: "İstanbul",
  };

  it("decodes back to exactly the vCard, Turkish letters included", () => {
    const v = buildVCard(card);
    expect(scan(v)).toBe(v);
    expect(v).toContain("FN:Tuğçe Şahin");
    expect(v).toContain("N:Şahin;Tuğçe;;;");
    expect(v).toContain("ORG:Işık Yazılım\\; A.Ş.");
    expect(v).toContain("TEL;TYPE=CELL:+905321112233");
    expect(v).toContain("URL:https://ornek.com");
    expect(v).toContain("X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/tugce-sahin");
    expect(v.split("\r\n")[0]).toBe("BEGIN:VCARD");
  });

  it("cannot be used to inject extra vCard lines", () => {
    const v = buildVCard({ fullName: "A\r\nTEL:000\nB", about: "x\r\nEMAIL:evil@x.com" });
    const lines = v.split("\r\n");
    expect(lines.filter((l) => l.startsWith("TEL"))).toHaveLength(0);
    expect(lines.filter((l) => l.startsWith("EMAIL"))).toHaveLength(0);
    expect(lines.find((l) => l.startsWith("NOTE:"))).toBe("NOTE:x\\nEMAIL:evil@x.com");
  });

  it("drops links that are not http(s) and bad e-mails", () => {
    const v = buildVCard({ fullName: "A B", website: "javascript:alert(1)", linkedin: "https://evil.com/in/x", email: "not-an-email" });
    expect(v).not.toContain("URL:");
    expect(v).not.toContain("X-SOCIALPROFILE");
    expect(v).not.toContain("EMAIL");
  });

  it("helpers", () => {
    expect(vcardEscape("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(vcardPhone("0532 (111) 22-33")).toBe("+905321112233");
    expect(vcardPhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(vcardPhone("112")).toBe("112");
    expect(linkedinUrl("https://www.linkedin.com/in/x")).toBe("https://www.linkedin.com/in/x");
  });
});

describe("utf8Bytes", () => {
  it("matches the platform encoder", () => {
    const { utf8Bytes } = require("../src/components/QrCode");
    for (const s of ["abc", "Tuğçe Şahin İıÖöÜü", "€", "😀 x"]) expect(utf8Bytes(s)).toEqual([...Buffer.from(s, "utf8")]);
  });
});
