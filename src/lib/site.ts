/**
 * The public origin, for absolute URLs in metadata, the sitemap and robots.txt.
 * NEXT_PUBLIC_SITE_URL wins (set it once a custom domain exists); on Vercel the
 * production domain is used automatically; locally it is the dev server.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && URL.canParse(explicit)) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}

/** Public, indexable pages, in the order they appear in the sitemap. */
export const PUBLIC_PAGES = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/login", changeFrequency: "yearly", priority: 0.5 },
] as const;
