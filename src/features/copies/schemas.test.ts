import { describe, expect, it } from "vitest";

import { copyInputSchema, loanDirectionFor, loanInputSchema } from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";

describe("copies", () => {
  it("tidy empty text to nothing", () => {
    expect(
      copyInputSchema.parse({ ownership: "owned", location: "  ", note: "" }),
    ).toEqual({
      ownership: "owned",
      edition_id: null,
      location: null,
      acquired_on: null,
      note: null,
    });
  });

  it("refuse an unknown way of holding a book", () => {
    expect(copyInputSchema.safeParse({ ownership: "stolen" }).success).toBe(
      false,
    );
  });
});

describe("loans", () => {
  it("go out from owned copies and come in otherwise", () => {
    expect(loanDirectionFor("owned")).toBe("lent");
    expect(loanDirectionFor("borrowed")).toBe("borrowed");
    expect(loanDirectionFor("library")).toBe("borrowed");
  });

  it("need a person and a start date", () => {
    expect(
      loanInputSchema.safeParse({
        copyId: ID,
        person: "  ",
        started_on: "2026-10-01",
      }).success,
    ).toBe(false);
    expect(
      loanInputSchema.parse({
        copyId: ID,
        person: " Rumi  K ",
        started_on: "2026-10-01",
      }),
    ).toMatchObject({ person: "Rumi K", due_on: null, note: null });
  });

  it("cannot be due before they start", () => {
    expect(
      loanInputSchema.safeParse({
        copyId: ID,
        person: "Rumi",
        started_on: "2026-10-01",
        due_on: "2026-09-30",
      }).success,
    ).toBe(false);
  });
});
