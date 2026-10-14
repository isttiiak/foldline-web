import { spawnSync } from "node:child_process";

import { createSerwistRoute } from "@serwist/turbopack";

// Changes with every deploy, so the offline page is fetched again after one.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  (spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf-8",
  }).stdout?.trim() ||
    crypto.randomUUID());

/** The service worker, built from `src/worker/sw.ts` and served at `/serwist/sw.js`. */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/worker/sw.ts",
    additionalPrecacheEntries: [{ url: "/offline", revision }],
    useNativeEsbuild: true,
  });
