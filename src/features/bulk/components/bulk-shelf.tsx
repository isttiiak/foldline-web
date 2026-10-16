"use client";

import { CheckSquare, Loader2, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { fieldClass } from "@/components/form-field";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { READ_STATES, type ReadState } from "@/features/books/schemas";
import { ShelfGrid } from "@/features/library/components/shelf-grid";
import type { ShelfBook } from "@/features/library/server/queries";
import { useOfferUndo } from "@/features/undo/components/undo-toast";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { BULK_MAX } from "../schemas";
import {
  bulkDeleteAction,
  type BulkResult,
  bulkSetStateAction,
  bulkShelfAction,
  bulkTagAction,
} from "../server/actions";

type Named = { id: string; name: string };

const NEW_TAG = "add:new";

/** The library grid, with a calm way to choose several books and change them together. */
export function BulkShelf({
  books,
  tags,
  shelves,
}: {
  books: ShelfBook[];
  tags: Named[];
  shelves: Named[];
}) {
  const t = useTranslations("Bulk");
  const tStates = useTranslations("AddBook.states");
  const offerUndo = useOfferUndo();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Books that leave the view (another filter, a delete) leave the selection too.
  const shown = new Set(books.map((book) => book.id));
  const chosen = [...selected].filter((id) => shown.has(id));

  function toggle(id: string) {
    setMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < BULK_MAX) next.add(id);
      return next;
    });
  }

  function stop() {
    setSelecting(false);
    setSelected(new Set());
    setNewTag(null);
    setMessage(null);
  }

  function run(action: () => Promise<BulkResult>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        setMessage(t(`errors.${result.reason}`));
        return;
      }
      setSelected(new Set());
      setNewTag(null);
      setConfirmDelete(false);
      offerUndo(result.undo);
      if (result.changed === 0) setMessage(t("nothingChanged"));
    });
  }

  function onTag(value: string) {
    if (!value) return;
    if (value === NEW_TAG) return setNewTag("");
    const [mode, tagId] = value.split(":") as ["add" | "remove", string];
    run(() => bulkTagAction({ workIds: chosen, mode, tagId }));
  }

  function onShelf(value: string) {
    if (!value) return;
    const [mode, shelfId] = value.split(":") as ["add" | "remove", string];
    run(() => bulkShelfAction({ workIds: chosen, mode, shelfId }));
  }

  const selectClass = cn(
    fieldClass,
    "h-10 w-auto max-w-44 appearance-auto py-0 pr-8 text-sm",
  );
  const none = chosen.length === 0 || pending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {selecting ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg"
              onClick={() =>
                setSelected(new Set(books.slice(0, BULK_MAX).map((b) => b.id)))
              }
            >
              {t("selectAll")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={stop}
            >
              <X className="size-4" aria-hidden />
              {t("done")}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setSelecting(true)}
          >
            <CheckSquare className="size-4" aria-hidden />
            {t("select")}
          </Button>
        )}
      </div>

      <ShelfGrid
        books={books}
        selection={selecting ? { selected, toggle } : undefined}
      />

      <AnimatePresence>
        {selecting && (
          <motion.div
            key="bulk-bar"
            role="toolbar"
            aria-label={t("barLabel")}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={springs.gentle}
            className="sticky bottom-4 z-30 flex flex-col gap-3 rounded-2xl border border-amber/25 bg-card/95 p-3 shadow-lg backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p
                className="mr-auto px-1 text-sm font-medium"
                aria-live="polite"
              >
                {t("chosen", { count: chosen.length })}
              </p>
              {pending && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-hidden
                />
              )}
              <select
                aria-label={t("state")}
                value=""
                disabled={none}
                onChange={(event) =>
                  event.target.value &&
                  run(() =>
                    bulkSetStateAction({
                      workIds: chosen,
                      state: event.target.value as ReadState,
                    }),
                  )
                }
                className={selectClass}
              >
                <option value="">{t("state")}</option>
                {READ_STATES.map((state) => (
                  <option key={state} value={state}>
                    {tStates(state)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("tag")}
                value=""
                disabled={none}
                onChange={(event) => onTag(event.target.value)}
                className={selectClass}
              >
                <option value="">{t("tag")}</option>
                <optgroup label={t("addTag")}>
                  {tags.map((tag) => (
                    <option key={tag.id} value={`add:${tag.id}`}>
                      {tag.name}
                    </option>
                  ))}
                  <option value={NEW_TAG}>{t("newTag")}</option>
                </optgroup>
                {tags.length > 0 && (
                  <optgroup label={t("removeTag")}>
                    {tags.map((tag) => (
                      <option key={tag.id} value={`remove:${tag.id}`}>
                        {tag.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {shelves.length > 0 && (
                <select
                  aria-label={t("shelf")}
                  value=""
                  disabled={none}
                  onChange={(event) => onShelf(event.target.value)}
                  className={selectClass}
                >
                  <option value="">{t("shelf")}</option>
                  <optgroup label={t("addShelf")}>
                    {shelves.map((shelf) => (
                      <option key={shelf.id} value={`add:${shelf.id}`}>
                        {shelf.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t("removeShelf")}>
                    {shelves.map((shelf) => (
                      <option key={shelf.id} value={`remove:${shelf.id}`}>
                        {shelf.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={none}
                onClick={() => setConfirmDelete(true)}
                className="h-10 gap-1.5 rounded-xl text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
                {t("delete")}
              </Button>
            </div>
            {newTag !== null && (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = newTag.trim();
                  if (name) {
                    run(() =>
                      bulkTagAction({ workIds: chosen, mode: "add", name }),
                    );
                  }
                }}
              >
                <input
                  autoFocus
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  maxLength={40}
                  aria-label={t("newTagLabel")}
                  placeholder={t("newTagLabel")}
                  className={cn(fieldClass, "h-10 max-w-60 flex-1")}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 rounded-xl"
                  disabled={none || !newTag.trim()}
                >
                  {t("addNewTag")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 rounded-xl"
                  onClick={() => setNewTag(null)}
                >
                  {t("cancel")}
                </Button>
              </form>
            )}
            {message && (
              <p role="status" className="px-1 text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {t("deleteTitle", { count: chosen.length })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("deleteBody")}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose
              render={
                <Button variant="ghost" className="h-10 rounded-xl px-4" />
              }
            >
              {t("keep")}
            </AlertDialogClose>
            <Button
              variant="destructive"
              className="h-10 gap-2 rounded-xl px-4"
              disabled={pending}
              onClick={() => run(() => bulkDeleteAction({ workIds: chosen }))}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              {t("deleteConfirm", { count: chosen.length })}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
