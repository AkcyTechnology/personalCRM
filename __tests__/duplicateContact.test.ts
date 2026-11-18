import { duplicateIds, findSameName, isDuplicateContact, phoneKey } from "../src/utils/duplicateContact";
import type { ContactForm } from "../src/screens/AddContactScreen";

const existing = [{ fullName: "Zeynep Kaya", phone: "+90 532 111 22 33", email: "Zeynep@Figma.com" } as ContactForm];

describe("isDuplicateContact", () => {
  it("matches by phone in different formats", () => {
    expect(isDuplicateContact({ name: "Z.", phone: "0532 111 2233" }, existing)).toBe(true);
  });
  it("matches by email case-insensitively", () => {
    expect(isDuplicateContact({ name: "Z.", email: "zeynep@figma.com" }, existing)).toBe(true);
  });
  it("never treats a name alone as the same person", () => {
    expect(isDuplicateContact({ name: "  zeynep   kaya " }, existing)).toBe(false);
    expect(findSameName("  zeynep   KAYA ", existing)?.fullName).toBe("Zeynep Kaya");
  });
  it("normalises international prefixes", () => {
    expect(phoneKey("+90 532 111 22 33")).toBe("5321112233");
    expect(phoneKey("00905321112233")).toBe("5321112233");
    expect(phoneKey("0532-111-2233")).toBe("5321112233");
    expect(phoneKey("112")).toBe("112");
  });
  it("matches any of several numbers", () => {
    expect(isDuplicateContact({ name: "Z.", phone: "0212 000 00 00", phones: ["0212 000 00 00", "0532 111 22 33"] }, existing)).toBe(true);
  });
  it("does not match a different person", () => {
    expect(isDuplicateContact({ name: "Mert Demir", phone: "0544 000 00 00" }, existing)).toBe(false);
  });
});

describe("duplicateIds", () => {
  const c = (id: string, fullName: string, phone = "") => ({ id, fullName, phone } as ContactForm);
  it("flags the same name (case and spacing aside) and a shared phone", () => {
    const ids = duplicateIds([
      c("1", "Ahmet Thaa"), c("2", "ahmet  thaa"),
      c("3", "Anneannem", "0532 111 22 33"), c("4", "Anneanne", "+90 532 111 2233"),
      c("5", "Alper Öner", "0544 000 00 00"),
    ]);
    expect([...ids].sort()).toEqual(["1", "2", "3", "4"]);
  });
  it("is empty when everyone is distinct", () => {
    expect(duplicateIds([c("1", "A"), c("2", "B")]).size).toBe(0);
  });
});
