import { isDuplicateContact } from "../src/utils/duplicateContact";
import type { ContactForm } from "../src/screens/AddContactScreen";

const existing = [{ fullName: "Zeynep Kaya", phone: "+90 532 111 22 33", email: "Zeynep@Figma.com" } as ContactForm];

describe("isDuplicateContact", () => {
  it("matches by phone in different formats", () => {
    expect(isDuplicateContact({ name: "Z.", phone: "0532 111 2233" }, existing)).toBe(true);
  });
  it("matches by email case-insensitively", () => {
    expect(isDuplicateContact({ name: "Z.", email: "zeynep@figma.com" }, existing)).toBe(true);
  });
  it("matches by normalised name", () => {
    expect(isDuplicateContact({ name: "  zeynep   kaya " }, existing)).toBe(true);
  });
  it("does not match a different person", () => {
    expect(isDuplicateContact({ name: "Mert Demir", phone: "0544 000 00 00" }, existing)).toBe(false);
  });
});
