import type { MetadataRoute } from "next";

import { PUBLIC_PAGES, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, base).toString(),
    changeFrequency,
    priority,
  }));
}
