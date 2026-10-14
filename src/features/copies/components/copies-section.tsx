"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { ChoiceChips } from "@/components/choice-chips";
import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import type { BookEdition } from "@/features/books/server/queries";
import { localToday } from "@/lib/dates";
import { cn } from "@/lib/utils";

import {
  COPY_LIMITS,
  loanDirectionFor,
  OWNERSHIPS,
  type Ownership,
} from "../schemas";
import {
  addCopyAction,
  deleteCopyAction,
  deleteLoanAction,
  returnLoanAction,
  startLoanAction,
  updateCopyAction,
  type CopyResult,
} from "../server/actions";
import type { Copy, Loan } from "../server/queries";

type Mode =
  | { kind: "add" }
  | { kind: "edit"; copyId: string }
  | { kind: "lend"; copyId: string }
  | null;

/** Run an action, keeping its error message (if any) for the section. */
function useRun() {
  const tErrors = useTranslations("Organise.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<CopyResult>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") setError(tErrors(result.reason));
      else after?.();
    });
  };
  return { pending, error, run };
}

/** The copies of a book the reader holds, and who has them right now. */
export function CopiesSection({
  workId,
  copies,
  editions,
}: {
  workId: string;
  copies: Copy[];
  editions: BookEdition[];
}) {
  const t = useTranslations("Copies");
  const [mode, setMode] = useState<Mode>(null);
  const { pending, error, run } = useRun();

  return (
    <section
      aria-labelledby="book-copies"
      className="flex flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="book-copies" className="text-xl font-semibold">
          {t("title")}
        </h2>
        {mode?.kind !== "add" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setMode({ kind: "add" })}
          >
            <Plus className="size-4" aria-hidden />
            {t("add")}
          </Button>
        )}
      </div>

      {copies.length === 0 && mode?.kind !== "add" && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {mode?.kind === "add" && (
        <CopyForm
          editions={editions}
          pending={pending}
          onCancel={() => setMode(null)}
          onSave={(copy) =>
            run(
              () => addCopyAction({ workId, copy }),
              () => setMode(null),
            )
          }
        />
      )}

      {copies.length > 0 && (
        <ul className="flex flex-col gap-4" aria-label={t("title")}>
          {copies.map((copy) => (
            <CopyCard
              key={copy.id}
              copy={copy}
              editions={editions}
              mode={mode}
              setMode={setMode}
              pending={pending}
              run={run}
            />
          ))}
        </ul>
      )}

      <div aria-live="polite" className="text-sm empty:hidden">
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function CopyCard({
  copy,
  editions,
  mode,
  setMode,
  pending,
  run,
}: {
  copy: Copy;
  editions: BookEdition[];
  mode: Mode;
  setMode: (mode: Mode) => void;
  pending: boolean;
  run: ReturnType<typeof useRun>["run"];
}) {
  const t = useTranslations("Copies");
  const tFormats = useTranslations("AddBook.formats");
  const format = useFormatter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const open = copy.loans.find((loan) => loan.returnedOn === null) ?? null;
  const past = copy.loans.filter((loan) => loan.returnedOn !== null);
  const edition = editions.find((e) => e.id === copy.editionId);
  const date = (value: string) =>
    format.dateTime(new Date(`${value}T00:00:00`), { dateStyle: "medium" });

  if (mode?.kind === "edit" && mode.copyId === copy.id) {
    return (
      <li className="rounded-2xl border border-border/70 bg-background/40 p-4">
        <CopyForm
          copy={copy}
          editions={editions}
          pending={pending}
          onCancel={() => setMode(null)}
          onSave={(values) =>
            run(
              () => updateCopyAction({ copyId: copy.id, copy: values }),
              () => setMode(null),
            )
          }
        />
      </li>
    );
  }

  const direction = loanDirectionFor(copy.ownership);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber/40 bg-amber/15 px-2.5 py-0.5 text-xs font-medium text-amber">
          {t(`ownership.${copy.ownership}`)}
        </span>
        {edition && (
          <span className="text-sm text-muted-foreground">
            {[tFormats(edition.format), edition.title]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </div>
      {(copy.location || copy.acquiredOn) && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {copy.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
              {copy.location}
            </span>
          )}
          {copy.acquiredOn && (
            <span className="text-muted-foreground">
              {t("acquired", { date: date(copy.acquiredOn) })}
            </span>
          )}
        </p>
      )}
      {copy.note && (
        <p className="text-sm whitespace-pre-line text-foreground/80">
          {copy.note}
        </p>
      )}

      {open && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-sm">
          {open.direction === "lent" ? (
            <ArrowUpRight className="size-4 text-teal" aria-hidden />
          ) : (
            <ArrowDownLeft className="size-4 text-teal" aria-hidden />
          )}
          <span className="min-w-0 flex-1">
            {t(open.direction === "lent" ? "lentTo" : "borrowedFrom", {
              person: open.person,
              date: date(open.startedOn),
            })}
            {open.dueOn && (
              <span className="text-muted-foreground">
                {" "}
                {t("due", { date: date(open.dueOn) })}
              </span>
            )}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg"
            disabled={pending}
            onClick={() =>
              run(() =>
                returnLoanAction({
                  loanId: open.id,
                  returned_on: maxDate(localToday(), open.startedOn),
                }),
              )
            }
          >
            <Undo2 className="size-3.5" aria-hidden />
            {t(open.direction === "lent" ? "cameBack" : "gaveBack")}
          </Button>
        </div>
      )}

      {mode?.kind === "lend" && mode.copyId === copy.id ? (
        <LoanForm
          direction={direction}
          pending={pending}
          onCancel={() => setMode(null)}
          onSave={(loan) =>
            run(
              () => startLoanAction({ copyId: copy.id, ...loan }),
              () => setMode(null),
            )
          }
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {!open && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-lg"
              onClick={() => setMode({ kind: "lend", copyId: copy.id })}
            >
              {direction === "lent" ? (
                <ArrowUpRight className="size-3.5" aria-hidden />
              ) : (
                <ArrowDownLeft className="size-3.5" aria-hidden />
              )}
              {t(direction === "lent" ? "lend" : "noteBorrowed")}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 rounded-lg"
            onClick={() => setMode({ kind: "edit", copyId: copy.id })}
          >
            <Pencil className="size-3.5" aria-hidden />
            {t("edit")}
          </Button>
          {confirmDelete ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 rounded-lg"
                disabled={pending}
                onClick={() => run(() => deleteCopyAction({ copyId: copy.id }))}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden />
                )}
                {t("removeConfirm")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-lg"
                onClick={() => setConfirmDelete(false)}
              >
                {t("keep")}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 rounded-lg text-muted-foreground"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              {t("remove")}
            </Button>
          )}
        </div>
      )}

      {past.length > 0 && (
        <details className="text-sm">
          <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            {t("history", { count: past.length })}
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {past.map((loan) => (
              <PastLoan
                key={loan.id}
                loan={loan}
                date={date}
                pending={pending}
                onDelete={() =>
                  run(() => deleteLoanAction({ loanId: loan.id }))
                }
              />
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function maxDate(a: string, b: string) {
  return a > b ? a : b;
}

function PastLoan({
  loan,
  date,
  pending,
  onDelete,
}: {
  loan: Loan;
  date: (value: string) => string;
  pending: boolean;
  onDelete: () => void;
}) {
  const t = useTranslations("Copies");
  return (
    <li className="flex items-center gap-2">
      <span className="min-w-0 flex-1 text-muted-foreground">
        {t(loan.direction === "lent" ? "pastLent" : "pastBorrowed", {
          person: loan.person,
          from: date(loan.startedOn),
          to: date(loan.returnedOn!),
        })}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        aria-label={t("forgetLoan", { person: loan.person })}
        className="grid size-7 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </li>
  );
}

function CopyForm({
  copy,
  editions,
  pending,
  onSave,
  onCancel,
}: {
  copy?: Copy;
  editions: BookEdition[];
  pending: boolean;
  onSave: (copy: {
    ownership: Ownership;
    edition_id: string | null;
    location: string;
    acquired_on: string | null;
    note: string;
  }) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Copies");
  const tFormats = useTranslations("AddBook.formats");
  const id = useId();
  const [ownership, setOwnership] = useState<Ownership>(
    copy?.ownership ?? "owned",
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => {
      const raw = form.get(name);
      return typeof raw === "string" ? raw : "";
    };
    onSave({
      ownership,
      edition_id: text("edition_id") || null,
      location: text("location"),
      acquired_on: text("acquired_on") || null,
      note: text("note"),
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <ChoiceChips
        legend={t("form.ownership")}
        name={`${id}-ownership`}
        size="sm"
        options={OWNERSHIPS}
        value={ownership}
        onChange={setOwnership}
        label={(value) => t(`ownership.${value}`)}
      />
      {editions.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-edition`} className="text-sm font-medium">
            {t("form.edition")}
          </label>
          <select
            id={`${id}-edition`}
            name="edition_id"
            defaultValue={copy?.editionId ?? ""}
            className={cn(fieldClass, "h-11 appearance-auto")}
          >
            <option value="">{t("form.anyEdition")}</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {[tFormats(edition.format), edition.title, edition.isbn13]
                  .filter(Boolean)
                  .join(" · ")}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-location`} className="text-sm font-medium">
            {t("form.location")}
          </label>
          <input
            id={`${id}-location`}
            name="location"
            defaultValue={copy?.location ?? ""}
            maxLength={COPY_LIMITS.location}
            placeholder={t("form.locationPlaceholder")}
            className={cn(fieldClass, "h-11")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-acquired`} className="text-sm font-medium">
            {t(ownership === "owned" ? "form.acquired" : "form.since")}
          </label>
          <input
            id={`${id}-acquired`}
            name="acquired_on"
            type="date"
            max={localToday()}
            defaultValue={copy?.acquiredOn ?? ""}
            className={cn(fieldClass, "h-11 [color-scheme:dark]")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-note`} className="text-sm font-medium">
          {t("form.note")}
        </label>
        <textarea
          id={`${id}-note`}
          name="note"
          rows={2}
          defaultValue={copy?.note ?? ""}
          maxLength={COPY_LIMITS.note}
          placeholder={t("form.notePlaceholder")}
          className={cn(fieldClass, "resize-y py-3")}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-xl px-4"
        >
          {t(copy ? "form.save" : "form.add")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-xl px-4"
          onClick={onCancel}
        >
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}

function LoanForm({
  direction,
  pending,
  onSave,
  onCancel,
}: {
  direction: "lent" | "borrowed";
  pending: boolean;
  onSave: (loan: {
    person: string;
    started_on: string;
    due_on: string | null;
    note: string;
  }) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Copies");
  const id = useId();
  const today = localToday();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => {
      const raw = form.get(name);
      return typeof raw === "string" ? raw : "";
    };
    onSave({
      person: text("person"),
      started_on: text("started_on") || today,
      due_on: text("due_on") || null,
      note: text("note"),
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border/70 p-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-person`} className="text-sm font-medium">
          {t(direction === "lent" ? "loan.to" : "loan.from")}
        </label>
        <input
          id={`${id}-person`}
          name="person"
          required
          maxLength={COPY_LIMITS.person}
          autoComplete="off"
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-start`} className="text-sm font-medium">
            {t("loan.since")}
          </label>
          <input
            id={`${id}-start`}
            name="started_on"
            type="date"
            max={today}
            defaultValue={today}
            className={cn(fieldClass, "h-11 [color-scheme:dark]")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-due`} className="text-sm font-medium">
            {t("loan.due")}
          </label>
          <input
            id={`${id}-due`}
            name="due_on"
            type="date"
            className={cn(fieldClass, "h-11 [color-scheme:dark]")}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-loan-note`} className="text-sm font-medium">
          {t("form.note")}
        </label>
        <input
          id={`${id}-loan-note`}
          name="note"
          maxLength={COPY_LIMITS.note}
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-xl px-4"
        >
          {t(direction === "lent" ? "loan.saveLent" : "loan.saveBorrowed")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-xl px-4"
          onClick={onCancel}
        >
          {t("form.cancel")}
        </Button>
      </div>
    </form>
  );
}
