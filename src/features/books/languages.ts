"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

/** Languages offered first; any other stored code is added to the list. */
export const LANGUAGES = [
  "en",
  "bn",
  "hi",
  "ur",
  "ar",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "ru",
  "ja",
  "zh",
  "ko",
  "tr",
  "fa",
];

/** The language list for a picker, with `current` first when it is unusual. */
export function languageOptions(current: string | null | undefined): string[] {
  return current && !LANGUAGES.includes(current)
    ? [current, ...LANGUAGES]
    : LANGUAGES;
}

/** Language names in the reader's locale ("bn" → "Bangla"). */
export function useLanguageName(): (code: string) => string {
  const locale = useLocale();
  const names = useMemo(
    () => new Intl.DisplayNames([locale], { type: "language" }),
    [locale],
  );
  return (code: string) => {
    try {
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
}
