import { describe, expect, test } from "vitest";

import { outcomeOf } from "@/features/progress/sync";
import { settleBatch } from "@/features/offline/queue";

import { SHARE_TARGET_PATH, webManifest } from "./manifest";
import { sharedFindText } from "./shared";

const copy = {
  name: "Foldline",
  description: "A private reading tracker.",
  addBook: "Add a book",
  library: "Library",
};

describe("webManifest", () => {
  const manifest = webManifest(copy);

  test("is installable: standalone, starts in the app, has 192 and 512 icons", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/app");
    const sizes = manifest.icons?.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(manifest.icons?.some((icon) => icon.purpose === "maskable")).toBe(
      true,
    );
  });

  test("receives shares on the Add book page", () => {
    expect(manifest.share_target).toEqual({
      action: SHARE_TARGET_PATH,
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    });
  });
});

describe("sharedFindText", () => {
  test("prefers a link that names an ISBN", () => {
    expect(
      sharedFindText({
        title: "Piranesi",
        url: "https://www.amazon.com/dp/1526622424",
      }),
    ).toBe("https://www.amazon.com/dp/1526622424");
  });

  test("finds a link with an ISBN inside the shared text", () => {
    expect(
      sharedFindText({
        text: "Look at this https://openlibrary.org/isbn/9781526622426 lovely",
      }),
    ).toBe("https://openlibrary.org/isbn/9781526622426");
  });

  test("finds a bare ISBN in the text", () => {
    expect(sharedFindText({ text: "ISBN 978-1-5266-2242-6" })).toBe(
      "978-1-5266-2242-6",
    );
  });

  test("falls back to the shared words, without links or app filler", () => {
    expect(
      sharedFindText({
        text: "Check out Piranesi by Susanna Clarke on Goodreads https://www.goodreads.com/book/show/50202953",
      }),
    ).toBe("Piranesi by Susanna Clarke");
    expect(sharedFindText({ title: "“The Overstory”" })).toBe("The Overstory");
  });

  test("keeps a lone link the box can report on, and ignores empty shares", () => {
    expect(sharedFindText({ url: "https://example.com/book" })).toBe(
      "https://example.com/book",
    );
    expect(sharedFindText({})).toBeNull();
    expect(sharedFindText({ title: " ", text: "" })).toBeNull();
  });
});

describe("offline progress sync", () => {
  test("only server trouble is retried; anything else leaves the queue", () => {
    expect(outcomeOf({ status: "logged" })).toBe("logged");
    expect(outcomeOf({ status: "error", reason: "generic" })).toBe("retry");
    expect(outcomeOf({ status: "error", reason: "rateLimited" })).toBe("retry");
    expect(outcomeOf({ status: "error", reason: "notFound" })).toBe("rejected");
    expect(outcomeOf({ status: "error", reason: "pastTheEnd" })).toBe(
      "rejected",
    );
  });

  test("settleBatch removes stored and rejected entries and keeps retries", () => {
    const batch = [{ entryId: "a" }, { entryId: "b" }, { entryId: "c" }];
    expect(settleBatch(batch, ["logged", "retry", "rejected"])).toEqual({
      done: ["a", "c"],
      logged: 1,
      rejected: 1,
      retry: 1,
    });
  });

  test("a short answer keeps the unanswered entries", () => {
    expect(
      settleBatch([{ entryId: "a" }, { entryId: "b" }], ["logged"]),
    ).toEqual({ done: ["a"], logged: 1, rejected: 0, retry: 1 });
  });
});
