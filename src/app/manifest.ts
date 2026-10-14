import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

import { webManifest } from "@/features/pwa/manifest";

/** The web app manifest: makes Foldline installable and a share target. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Pwa.manifest");
  return webManifest({
    name: t("name"),
    description: t("description"),
    addBook: t("addBook"),
    library: t("library"),
  });
}
