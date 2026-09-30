import { buildLlmsTxt } from "@/features/marketing/llms-txt";
import { siteUrl } from "@/lib/site";

import messages from "../../../messages/en.json";

// Built once at build time, like robots.txt and the sitemap.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(messages, siteUrl().origin), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
