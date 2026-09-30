import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Json } from "@/lib/supabase/database.types";

import {
  GB_VOLUMES,
  OL_EDITION,
  OL_ISBN_SEARCH,
  OL_SEARCH,
} from "../__fixtures__/providers";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/rate-limit/server/rate-limit", async () => ({
  RATE_LIMITS: (await import("@/features/rate-limit/policies")).RATE_LIMITS,
  rateLimitGlobal: vi.fn(),
}));

const { cacheKey, withCache } = await import("./cache");
const { lookupIsbn, searchBooks } = await import("./lookup");
type LookupDeps = import("./lookup").LookupDeps;

const ISBN = "9780140268867";

function memoryStore() {
  const rows = new Map<string, Json>();
  return {
    rows,
    get: vi.fn(
      async (provider: string, key: string) =>
        rows.get(`${provider}|${key}`) ?? null,
    ),
    set: vi.fn(async (provider: string, key: string, payload: Json) => {
      rows.set(`${provider}|${key}`, payload);
    }),
  };
}

type Route = { match: string; status?: number; body?: unknown };

/** A fake fetch that answers by URL substring and parses with the real schema. */
function fakeFetch(routes: Route[]) {
  return vi.fn(
    async (
      url: string,
      schema: {
        safeParse: (v: unknown) => { success: boolean; data?: unknown };
      },
    ) => {
      const route = routes.find((r) => url.includes(r.match));
      if (!route || route.status === 500)
        return { ok: false as const, reason: "error" as const };
      if (route.status === 404)
        return { ok: false as const, reason: "not_found" as const };
      const parsed = schema.safeParse(route.body);
      return parsed.success
        ? { ok: true as const, data: parsed.data }
        : { ok: false as const, reason: "error" as const };
    },
  );
}

function deps(overrides: Partial<LookupDeps> & { routes?: Route[] } = {}) {
  const { routes = [], ...rest } = overrides;
  return {
    store: memoryStore(),
    fetchJson: fakeFetch(routes) as unknown as LookupDeps["fetchJson"],
    withinBudget: vi.fn(async () => true),
    openLibraryContact: "owner@example.test",
    googleBooksKey: null,
    ...rest,
  } satisfies LookupDeps;
}

const OL_ROUTES: Route[] = [
  { match: "/isbn/", body: OL_EDITION },
  { match: "openlibrary.org/search.json", body: OL_ISBN_SEARCH },
];
const GB_ROUTE: Route = { match: "googleapis.com", body: GB_VOLUMES };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("withCache", () => {
  test("serves a cached answer without loading", async () => {
    const store = memoryStore();
    store.rows.set("openlibrary|k", { found: true, value: 1 });
    const load = vi.fn();
    await expect(
      withCache(store, "openlibrary", "k", 60, load),
    ).resolves.toEqual({
      status: "found",
      value: 1,
    });
    expect(load).not.toHaveBeenCalled();
  });

  test("caches found and not-found, never unavailable", async () => {
    const store = memoryStore();
    await withCache(store, "openlibrary", "a", 60, async () => ({
      status: "found",
      value: 2,
    }));
    await withCache(store, "openlibrary", "b", 60, async () => ({
      status: "not_found",
    }));
    await withCache(store, "openlibrary", "c", 60, async () => ({
      status: "unavailable",
    }));
    expect(store.set).toHaveBeenCalledTimes(2);
    expect(store.set).toHaveBeenCalledWith(
      "openlibrary",
      "a",
      { found: true, value: 2 },
      60,
    );
    expect(store.set).toHaveBeenCalledWith(
      "openlibrary",
      "b",
      { found: false },
      86400,
    );
  });

  test("a broken cache fails open", async () => {
    const store = {
      get: vi.fn(async () => {
        throw new Error("down");
      }),
      set: vi.fn(async () => {
        throw new Error("down");
      }),
    };
    await expect(
      withCache(store, "googlebooks", "k", 60, async () => ({
        status: "found",
        value: 3,
      })),
    ).resolves.toEqual({ status: "found", value: 3 });
  });

  test("cache keys are normalised and user-free", () => {
    expect(cacheKey("search", "  The   Odyssey ")).toBe("search:the odyssey");
    expect(cacheKey("isbn", ISBN)).toBe(`isbn:${ISBN}`);
  });
});

describe("lookupIsbn", () => {
  test("Open Library leads and Google Books fills the gaps", async () => {
    const d = deps({ routes: [...OL_ROUTES, GB_ROUTE] });
    const result = await lookupIsbn(ISBN, d);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      provider: "openlibrary",
      title: "The Odyssey",
      pageCount: 560,
      authors: ["Homer", "Robert Fagles"],
      description: "The epic of Odysseus' return home.\nA classic.",
      providerIds: {
        openlibrary: { work: "OL61982W", edition: "OL7353617M" },
        googlebooks: { volume: "4nvTswEACAAJ" },
      },
    });
  });

  test("sends the Foldline User-Agent to Open Library only", async () => {
    const d = deps({ routes: [...OL_ROUTES, GB_ROUTE] });
    await lookupIsbn(ISBN, d);
    const calls = vi.mocked(d.fetchJson).mock.calls;
    for (const [url, , headers] of calls) {
      if (url.includes("openlibrary.org")) {
        expect(headers?.["user-agent"]).toMatch(
          /^Foldline\/\d+\.\d+\.\d+ \(owner@example\.test\)$/,
        );
      } else {
        expect(headers).toBeUndefined();
      }
    }
  });

  test("a second lookup is served from the cache", async () => {
    const d = deps({ routes: [...OL_ROUTES, GB_ROUTE] });
    await lookupIsbn(ISBN, d);
    const calls = vi.mocked(d.fetchJson).mock.calls.length;
    await lookupIsbn(ISBN, d);
    expect(vi.mocked(d.fetchJson).mock.calls.length).toBe(calls);
  });

  test("Open Library down: Google Books answers", async () => {
    const d = deps({
      routes: [{ match: "openlibrary.org", status: 500 }, GB_ROUTE],
    });
    const result = await lookupIsbn(ISBN, d);
    expect(result).toMatchObject({
      ok: true,
      value: { provider: "googlebooks" },
    });
  });

  test("Open Library over budget: it is not called", async () => {
    const d = deps({
      routes: [...OL_ROUTES, GB_ROUTE],
      withinBudget: vi.fn(async (policy) => policy.name !== "openlibrary"),
    });
    const result = await lookupIsbn(ISBN, d);
    expect(result).toMatchObject({
      ok: true,
      value: { provider: "googlebooks" },
    });
    expect(
      vi
        .mocked(d.fetchJson)
        .mock.calls.some(([url]) => url.includes("openlibrary.org")),
    ).toBe(false);
  });

  test("no contact email: Open Library is skipped", async () => {
    const d = deps({
      routes: [...OL_ROUTES, GB_ROUTE],
      openLibraryContact: null,
    });
    const result = await lookupIsbn(ISBN, d);
    expect(result).toMatchObject({
      ok: true,
      value: { provider: "googlebooks" },
    });
  });

  test("both unknown: not found; both down: busy", async () => {
    const missing = deps({
      routes: [
        { match: "openlibrary.org", status: 404 },
        { match: "googleapis.com", body: { totalItems: 0 } },
      ],
    });
    await expect(lookupIsbn(ISBN, missing)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    await expect(lookupIsbn(ISBN, deps())).resolves.toEqual({
      ok: false,
      reason: "busy",
    });
  });
});

describe("searchBooks", () => {
  test("uses Open Library first", async () => {
    const d = deps({
      routes: [
        { match: "openlibrary.org/search.json", body: OL_SEARCH },
        GB_ROUTE,
      ],
    });
    const result = await searchBooks("pather panchali", d);
    expect(result).toMatchObject({
      ok: true,
      value: [{ provider: "openlibrary" }],
    });
    expect(
      vi
        .mocked(d.fetchJson)
        .mock.calls.some(([url]) => url.includes("googleapis.com")),
    ).toBe(false);
  });

  test("falls back to Google Books when Open Library finds nothing", async () => {
    const d = deps({
      routes: [
        { match: "openlibrary.org/search.json", body: { docs: [] } },
        GB_ROUTE,
      ],
    });
    const result = await searchBooks("odyssey", d);
    expect(result).toMatchObject({
      ok: true,
      value: [{ provider: "googlebooks" }],
    });
  });

  test("nothing anywhere is an empty list; both down is busy", async () => {
    const empty = deps({
      routes: [
        { match: "openlibrary.org/search.json", body: { docs: [] } },
        { match: "googleapis.com", body: { totalItems: 0 } },
      ],
    });
    await expect(searchBooks("zzzz", empty)).resolves.toEqual({
      ok: true,
      value: [],
    });
    await expect(searchBooks("zzzz", deps())).resolves.toEqual({
      ok: false,
      reason: "busy",
    });
  });
});
