import { expect, test } from "vitest";

import { buildExport, exportFilename } from "./build-export";

const at = new Date("2026-10-01T08:30:00Z");

test("wraps the user's tables with format, version, time and account", () => {
  const file = buildExport({
    user: { id: "u1", email: "reader@example.com" },
    tables: { profiles: [{ id: "u1", display_name: "Reader" }] },
    exportedAt: at,
  });

  expect(file).toEqual({
    format: "foldline-export",
    version: 1,
    exportedAt: "2026-10-01T08:30:00.000Z",
    account: { id: "u1", email: "reader@example.com" },
    tables: { profiles: [{ id: "u1", display_name: "Reader" }] },
  });
  expect(JSON.parse(JSON.stringify(file))).toEqual(file);
});

test("names the file after the export date", () => {
  expect(exportFilename(at)).toBe("foldline-export-2026-10-01.json");
});
