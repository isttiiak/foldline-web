import type { MetadataRoute } from "next";

/** Warm charcoal, the app's background and the installed app's frame. */
export const APP_BACKGROUND = "#1d1a16";

/** Icons the installed app uses, drawn by `src/app/icons/[name]/route.tsx`. */
export const APP_ICONS = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
} as const;
export type AppIconName = keyof typeof APP_ICONS;

/** Where a book shared from another app lands; read by the Add book page. */
export const SHARE_TARGET_PATH = "/app/add";

export function webManifest(copy: {
  name: string;
  description: string;
  addBook: string;
  library: string;
}): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: copy.name,
    short_name: copy.name,
    description: copy.description,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    categories: ["books", "lifestyle", "productivity"],
    icons: Object.entries(APP_ICONS).map(([name, icon]) => ({
      src: `/icons/${name}`,
      sizes: `${icon.size}x${icon.size}`,
      type: "image/png",
      purpose: icon.maskable ? "maskable" : "any",
    })),
    shortcuts: [
      { name: copy.library, url: "/app" },
      { name: copy.addBook, url: "/app/add" },
    ],
    share_target: {
      action: SHARE_TARGET_PATH,
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
