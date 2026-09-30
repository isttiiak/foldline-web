import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Keep the dev-only Next.js badge clear of the sidebar Sign out button.
  devIndicators: { position: "bottom-right" },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
