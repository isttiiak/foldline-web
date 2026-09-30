import { expect, test } from "vitest";

import messages from "../../../messages/en.json";

import { buildLlmsTxt } from "./llms-txt";

const text = buildLlmsTxt(messages, "https://foldline.example");

test("follows the llms.txt shape: H1, summary quote, then sections", () => {
  const lines = text.split("\n");
  expect(lines[0]).toBe("# Foldline");
  expect(lines[2]).toBe(`> ${messages.Metadata.description}`);
  expect(text).toContain("## Questions, answered");
  expect(text).toContain("## Links");
});

test("links to the public pages with absolute URLs", () => {
  for (const path of ["/", "/privacy", "/terms", "/login"]) {
    expect(text).toContain(`(https://foldline.example${path})`);
  }
  expect(text).not.toContain("/app");
});

test("includes every FAQ answer and promise from the landing page", () => {
  for (const { q, a } of Object.values(messages.Home.faq.items)) {
    expect(text).toContain(`### ${q}`);
    expect(text).toContain(a);
  }
  for (const { title } of Object.values(messages.Home.promises.items)) {
    expect(text).toContain(`- ${title}:`);
  }
});
