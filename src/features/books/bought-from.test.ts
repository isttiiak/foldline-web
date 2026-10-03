import { describe, expect, it } from "vitest";

import { boughtFromLink } from "./bought-from";

describe("boughtFromLink", () => {
  it("returns a web link as a link", () => {
    expect(boughtFromLink("https://www.rokomari.com/book/222841")).toBe(
      "https://www.rokomari.com/book/222841",
    );
    expect(boughtFromLink("  http://example.com/a  ")).toBe(
      "http://example.com/a",
    );
  });

  it("leaves shop names and addresses as plain text", () => {
    expect(boughtFromLink("Aziz Super Market, Shahbag, Dhaka")).toBeNull();
    expect(boughtFromLink("Ekushey Boi Mela 2024")).toBeNull();
    expect(boughtFromLink("")).toBeNull();
    expect(boughtFromLink(null)).toBeNull();
  });

  it("never links other schemes", () => {
    expect(boughtFromLink("javascript:alert(1)")).toBeNull();
    expect(boughtFromLink("mailto:a@b.co")).toBeNull();
  });
});
