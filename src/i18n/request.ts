import { getRequestConfig } from "next-intl/server";

// English only for now. Bangla (`bn`) is deferred, see docs/ROADMAP.md.
export default getRequestConfig(async () => {
  const locale = "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
