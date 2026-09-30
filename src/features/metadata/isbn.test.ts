import { describe, expect, test } from "vitest";

import {
  isbn10To13,
  isbn13To10,
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbn,
  toIsbn13,
} from "./isbn";

describe("ISBN helpers", () => {
  test("normalises spacing, hyphens, labels and a lowercase x", () => {
    expect(normalizeIsbn(" ISBN-13: 978-0-14-026886-7 ")).toBe("9780140268867");
    expect(normalizeIsbn("0-8044-2957-x")).toBe("080442957X");
  });

  test("checks ISBN-10 and ISBN-13 check digits", () => {
    expect(isValidIsbn10("0140268863")).toBe(true);
    expect(isValidIsbn10("080442957X")).toBe(true);
    expect(isValidIsbn10("0140268864")).toBe(false);
    expect(isValidIsbn13("9780140268867")).toBe(true);
    expect(isValidIsbn13("9780140268868")).toBe(false);
    expect(isValidIsbn13("1234567890123")).toBe(false);
  });

  test("converts between ISBN-10 and ISBN-13", () => {
    expect(isbn10To13("0140268863")).toBe("9780140268867");
    expect(isbn13To10("9780140268867")).toBe("0140268863");
    expect(isbn13To10("9798886450040")).toBeNull();
  });

  test("toIsbn13 accepts either form and rejects the rest", () => {
    expect(toIsbn13("0-14-026886-3")).toBe("9780140268867");
    expect(toIsbn13("978-0140268867")).toBe("9780140268867");
    expect(toIsbn13("hello")).toBeNull();
    expect(toIsbn13("0140268864")).toBeNull();
  });
});
