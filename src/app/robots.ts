import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/** Public pages are indexable; the private app and auth plumbing are not. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/auth/", "/goodbye"],
    },
    sitemap: new URL("/sitemap.xml", base).toString(),
    host: base.origin,
  };
}
