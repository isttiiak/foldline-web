import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Keep the dev-only Next.js badge clear of the sidebar Sign out button.
  devIndicators: { position: "bottom-right" },
  async headers() {
    return [
      {
        // The service worker must never be served stale from the HTTP cache.
        source: "/serwist/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withSerwist(withNextIntl(nextConfig));
