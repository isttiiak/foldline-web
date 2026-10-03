"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookPlus,
  BookOpen,
  Library,
  ListChecks,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LogProgress } from "@/features/progress/components/log-progress";
import { getPaletteBooks } from "@/features/library/server/palette";

import { canLogProgress, fold, matchBooks, type PaletteBook } from "../match";

const MAX_BOOKS = 8;
const MAX_LOG_ROWS = 5;
export const PALETTE_BOOKS_KEY = ["palette-books"] as const;

type Step =
  { kind: "list" } | { kind: "pick" } | { kind: "log"; book: PaletteBook };
type Destination = { key: string; href: string; icon: LucideIcon };

const DESTINATIONS: Destination[] = [
  { key: "add", href: "/app/add", icon: BookPlus },
  { key: "library", href: "/app", icon: Library },
  { key: "stats", href: "/app/stats", icon: BarChart3 },
  { key: "profile", href: "/app/profile", icon: UserRound },
  { key: "settings", href: "/app/settings", icon: Settings },
];

/**
 * Find a book, add one or log progress from the keyboard (⌘K / Ctrl+K). Books
 * load once when it opens and matching runs here, so typing sends nothing anywhere.
 */
export function CommandPalette({
  open,
  onOpenChange,
  showStats = true,
}: {
  /** False when the reader hid their stats. */
  showStats?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Palette");
  const tNav = useTranslations("AppNav");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>({ kind: "list" });
  const { data: books = [], isPending } = useQuery({
    queryKey: PALETTE_BOOKS_KEY,
    queryFn: getPaletteBooks,
    enabled: open,
  });

  function change(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setQuery("");
      setStep({ kind: "list" });
      // Progress may have been logged: the next opening loads fresh data.
      void queryClient.invalidateQueries({ queryKey: PALETTE_BOOKS_KEY });
    }
  }

  function go(href: string) {
    change(false);
    router.push(href);
  }

  const picking = step.kind === "pick";
  const matches = matchBooks(books, query);
  const loggable = matches.filter(canLogProgress);
  const folded = fold(query);
  const destinations = DESTINATIONS.filter(
    ({ key }) =>
      (showStats || key !== "stats") &&
      (folded === "" ||
        fold(
          tNav(key as "add" | "library" | "stats" | "profile" | "settings"),
        ).includes(folded)),
  );
  const showLogAction =
    !picking && (folded === "" || fold(t("logProgress")).includes(folded));

  return (
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs motion-reduce:transition-none" />
        <Dialog.Popup
          data-slot="command-palette"
          className="fixed top-[12dvh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl transition duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none"
        >
          <Dialog.Title className="sr-only">{t("title")}</Dialog.Title>
          {step.kind === "log" ? (
            <div className="flex flex-col gap-3 p-4">
              <p className="px-1 font-medium">
                {t("loggingFor", { title: step.book.title })}
              </p>
              <LogProgress
                readId={step.book.readId!}
                format={step.book.format}
                pageCount={step.book.pageCount}
                durationMinutes={step.book.durationMinutes}
                last={step.book.last}
                finished={false}
                onFinish={() => go(`/app/books/${step.book.id}`)}
                onClose={() => setStep({ kind: "list" })}
              />
            </div>
          ) : (
            <Command shouldFilter={false} label={t("title")} loop>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={picking ? t("pickPlaceholder") : t("placeholder")}
                aria-label={t("title")}
              />
              <CommandList>
                <CommandEmpty>
                  {isPending && open ? t("loading") : t("empty")}
                </CommandEmpty>
                {!picking && destinations.length > 0 && (
                  <CommandGroup heading={t("actions")}>
                    {destinations.map(({ key, href, icon: Icon }) => (
                      <CommandItem
                        key={key}
                        value={`go-${key}`}
                        onSelect={() => go(href)}
                      >
                        <Icon className="size-4 text-amber" aria-hidden />
                        {key === "add"
                          ? t("addBook")
                          : t("goTo", {
                              place: tNav(
                                key as
                                  "library" | "stats" | "profile" | "settings",
                              ),
                            })}
                      </CommandItem>
                    ))}
                    {showLogAction && (
                      <CommandItem
                        value="action-log"
                        onSelect={() => {
                          setQuery("");
                          setStep({ kind: "pick" });
                        }}
                      >
                        <ListChecks className="size-4 text-amber" aria-hidden />
                        {t("logProgress")}
                      </CommandItem>
                    )}
                  </CommandGroup>
                )}
                {picking && (
                  <CommandGroup heading={t("logProgressFor")}>
                    {loggable.map((book) => (
                      <BookRow
                        key={book.id}
                        book={book}
                        value={`pick-${book.id}`}
                        onSelect={() => {
                          setQuery("");
                          setStep({ kind: "log", book });
                        }}
                      />
                    ))}
                  </CommandGroup>
                )}
                {!picking && folded !== "" && matches.length > 0 && (
                  <CommandGroup heading={t("books")}>
                    {matches.slice(0, MAX_BOOKS).map((book) => (
                      <BookRow
                        key={book.id}
                        book={book}
                        value={`book-${book.id}`}
                        onSelect={() => go(`/app/books/${book.id}`)}
                      />
                    ))}
                  </CommandGroup>
                )}
                {!picking && folded !== "" && loggable.length > 0 && (
                  <CommandGroup heading={t("logProgress")}>
                    {loggable.slice(0, MAX_LOG_ROWS).map((book) => (
                      <BookRow
                        key={book.id}
                        book={book}
                        value={`log-${book.id}`}
                        icon={ListChecks}
                        onSelect={() => {
                          setQuery("");
                          setStep({ kind: "log", book });
                        }}
                      />
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BookRow({
  book,
  value,
  icon: Icon = BookOpen,
  onSelect,
}: {
  book: PaletteBook;
  value: string;
  icon?: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <Icon className="size-4 shrink-0 text-amber" aria-hidden />
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{book.title}</span>
        {book.authors.length > 0 && (
          <span className="truncate text-xs text-muted-foreground">
            {book.authors.join(", ")}
          </span>
        )}
      </span>
    </CommandItem>
  );
}
