import { describe, expect, test } from "vitest";

import { parseCount, toAsciiDigits, uniqueNames } from "./text";

describe("Bengali digits", () => {
  test("toAsciiDigits maps ০-৯ and keeps everything else", () => {
    expect(toAsciiDigits("১৯৯৬")).toBe("1996");
    expect(toAsciiDigits("৩য় মুদ্রণ, ২০২৩")).toBe("3য় মুদ্রণ, 2023");
    expect(toAsciiDigits("1999")).toBe("1999");
  });

  test("parseCount reads whole numbers in either digit set", () => {
    expect(parseCount("৩২০")).toBe(320);
    expect(parseCount(" 1,024 ")).toBe(1024);
    expect(parseCount("0")).toBeNull();
    expect(parseCount("12.5")).toBeNull();
    expect(parseCount("abc")).toBeNull();
    expect(parseCount("")).toBeNull();
  });
});

test("uniqueNames tidies and drops repeats", () => {
  expect(uniqueNames([" A  B ", "a b", ""])).toEqual(["A B"]);
});
