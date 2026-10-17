import { socialProfileUrl, toSafeWebUrl, toWhatsAppNumber } from "../src/utils/links";

jest.mock("../src/components/Toast", () => ({ showToast: jest.fn() }));

describe("toWhatsAppNumber", () => {
  it.each([
    ["0532 111 22 33", "905321112233"],
    ["532 111 22 33", "905321112233"],
    ["+90 532 111 22 33", "905321112233"],
    ["0090 532 111 22 33", "905321112233"],
    ["+49 151 2345 6789", "4915123456789"],
  ])("%s → %s", (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected);
  });

  it("rejects garbage", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber("abc")).toBeNull();
    expect(toWhatsAppNumber("123")).toBeNull();
  });
});

describe("toSafeWebUrl", () => {
  it("adds https to bare domains", () => {
    expect(toSafeWebUrl("example.com")).toBe("https://example.com");
    expect(toSafeWebUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
  });

  it("blocks non-web schemes and junk", () => {
    expect(toSafeWebUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeWebUrl("file:///etc/passwd")).toBeNull();
    expect(toSafeWebUrl("intent://x#Intent;end")).toBeNull();
    expect(toSafeWebUrl("tel:123")).toBeNull();
    expect(toSafeWebUrl("not a url")).toBeNull();
    expect(toSafeWebUrl("localhost")).toBeNull();
  });
});

describe("socialProfileUrl", () => {
  it("builds profile urls from handles", () => {
    expect(socialProfileUrl("Instagram", "@ayse.yildiz")).toBe("https://www.instagram.com/ayse.yildiz");
    expect(socialProfileUrl("LinkedIn", "zeynepkaya")).toBe("https://www.linkedin.com/in/zeynepkaya");
    expect(socialProfileUrl("LinkedIn", "linkedin.com/in/x")).toBe("https://linkedin.com/in/x");
  });

  it("refuses unsafe input", () => {
    expect(socialProfileUrl("Instagram", "javascript:alert(1)")).toBeNull();
    expect(socialProfileUrl("Bilinmeyen", "kullanici")).toBeNull();
  });
});
