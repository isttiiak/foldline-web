"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { ChoiceChips } from "@/components/choice-chips";
import { fieldClass } from "@/components/form-field";
import {
  EDITION_FORMATS,
  READ_STATES,
  type ReadState,
} from "@/features/books/schemas";
import { cn } from "@/lib/utils";

import {
  libraryHref,
  SORTS,
  type LibraryParams,
  type StateCounts,
} from "../query";

const SEARCH_DELAY_MS = 300;
const STATE_OPTIONS = ["all", ...READ_STATES] as const;

/** Search, state chips, format and sort for the library. Every choice lives in the URL. */
export function LibraryToolbar({
  params,
  counts,
}: {
  params: LibraryParams;
  counts: StateCounts;
}) {
  const t = useTranslations("Library.toolbar");
  const tStates = useTranslations("AddBook.states");
  const tFormats = useTranslations("AddBook.formats");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(params.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The URL echoes back what we pushed, often a few letters behind what is typed now.
  // Only a value we did not push (a link, the back button) replaces the box.
  const [pushed, setPushed] = useState<string[]>([]);
  const [seenQ, setSeenQ] = useState(params.q);
  if (seenQ !== params.q) {
    setSeenQ(params.q);
    const ours = pushed.indexOf(params.q);
    if (ours === -1) setText(params.q);
    else setPushed(pushed.slice(ours + 1));
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  function go(next: Partial<LibraryParams>) {
    // Any change to what is shown starts again from the first page.
    const href = libraryHref({ ...params, pages: 1, ...next });
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function onSearch(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const q = value.trim();
      setPushed((list) => [...list, q]);
      go({ q });
    }, SEARCH_DELAY_MS);
  }

  const selectClass = cn(fieldClass, "h-10 w-auto appearance-auto py-0 pr-8");
  const stateLabel = (value: ReadState | "all") =>
    `${value === "all" ? t("all") : tStates(value)} ${counts[value]}`;

  return (
    <search
      aria-label={t("label")}
      aria-busy={pending}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            value={text}
            onChange={(event) => onSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && text) {
                event.preventDefault();
                onSearch("");
              }
            }}
            maxLength={100}
            autoComplete="off"
            aria-label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            className={cn(fieldClass, "h-10 pr-10 pl-10")}
          />
          {text && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label={t("clearSearch")}
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <select
          aria-label={t("format")}
          value={params.format ?? ""}
          onChange={(event) =>
            go({
              format: (event.target.value ||
                undefined) as LibraryParams["format"],
            })
          }
          className={selectClass}
        >
          <option value="">{t("allFormats")}</option>
          {EDITION_FORMATS.map((format) => (
            <option key={format} value={format}>
              {tFormats(format)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("sort")}
          value={params.sort}
          onChange={(event) =>
            go({ sort: event.target.value as LibraryParams["sort"] })
          }
          className={selectClass}
        >
          {SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(`sorts.${sort}`)}
            </option>
          ))}
        </select>
      </div>
      <ChoiceChips
        legend={t("stateLegend")}
        hideLegend
        name="library-state"
        size="sm"
        options={STATE_OPTIONS}
        value={params.state ?? "all"}
        onChange={(value) => go({ state: value === "all" ? undefined : value })}
        label={stateLabel}
      />
    </search>
  );
}
