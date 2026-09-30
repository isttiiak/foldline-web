import { expect, test } from "vitest";

import messages from "../../messages/en.json";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object")
    return Object.values(value).flatMap(strings);
  return [];
}

const EM_DASH = String.fromCharCode(0x2014);

test("English messages never contain an em dash", () => {
  const offenders = strings(messages).filter((s) => s.includes(EM_DASH));
  expect(offenders).toEqual([]);
});
