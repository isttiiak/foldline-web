"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { ChoiceChips } from "@/components/choice-chips";
import { fieldClass } from "@/components/form-field";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { READ_STATES, type ReadState } from "@/features/books/schemas";
import { cn } from "@/lib/utils";

import {
  CUSTOM_LIMITS,
  FIELD_KINDS,
  RATING_SCALES,
  type CustomField,
  type FieldKind,
  type RatingScale,
} from "../schemas";
import {
  createFieldAction,
  createStatusAction,
  deleteFieldAction,
  deleteStatusAction,
  setRatingScaleAction,
  updateFieldAction,
  updateStatusAction,
  type CustomResult,
} from "../server/actions";
import type { CustomStatus } from "../server/queries";

function useRun() {
  const tErrors = useTranslations("Organise.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<CustomResult>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") setError(tErrors(result.reason));
      else after?.();
    });
  };
  return { pending, error, run };
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <div aria-live="polite" className="text-sm empty:hidden">
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** How ratings look, or no ratings at all. Stored ratings are never lost. */
export function RatingScalePicker({ scale }: { scale: RatingScale }) {
  const t = useTranslations("Custom.ratings");
  const tErrors = useTranslations("Organise.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(scale);
  return (
    <div className="flex flex-col gap-3">
      <ChoiceChips
        legend={t("legend")}
        hideLegend
        name="rating-scale"
        options={RATING_SCALES}
        value={shown}
        disabled={pending}
        onChange={(value) => {
          const before = shown;
          setShown(value);
          setError(null);
          startTransition(async () => {
            const result = await setRatingScaleAction(value);
            if (result.status === "error") {
              setShown(before);
              setError(tErrors(result.reason));
            }
          });
        }}
        label={(value) => t(`scales.${value}`)}
      />
      <p className="text-sm text-muted-foreground">{t(`hints.${shown}`)}</p>
      <ErrorLine error={error} />
    </div>
  );
}

/** The reader's own statuses, each inside one reading state. */
export function StatusesManager({ statuses }: { statuses: CustomStatus[] }) {
  const t = useTranslations("Custom.statuses");
  const tStates = useTranslations("AddBook.states");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { pending, error, run } = useRun();

  return (
    <div className="flex flex-col gap-4">
      {statuses.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label={t("list")}>
          {statuses.map((status) =>
            editing === status.id ? (
              <li key={status.id}>
                <StatusForm
                  status={status}
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSave={(values) =>
                    run(
                      () =>
                        updateStatusAction({ statusId: status.id, ...values }),
                      () => setEditing(null),
                    )
                  }
                  onDelete={() =>
                    run(
                      () => deleteStatusAction({ statusId: status.id }),
                      () => setEditing(null),
                    )
                  }
                />
              </li>
            ) : (
              <li
                key={status.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-2"
              >
                <span className="font-medium">{status.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t("inside", { state: tStates(status.baseState) })}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(status.id)}
                  aria-label={t("edit", { name: status.name })}
                  className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Pencil className="size-3.5" aria-hidden />
                </button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {editing === "new" ? (
        <StatusForm
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(values) =>
            run(
              () => createStatusAction(values),
              () => setEditing(null),
            )
          }
        />
      ) : (
        <Button
          variant="outline"
          className="h-10 w-fit gap-1.5 rounded-xl"
          onClick={() => setEditing("new")}
        >
          <Plus className="size-4" aria-hidden />
          {t("add")}
        </Button>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

function StatusForm({
  status,
  pending,
  onSave,
  onCancel,
  onDelete,
}: {
  status?: CustomStatus;
  pending: boolean;
  onSave: (values: { name: string; base_state: ReadState }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("Custom.statuses");
  const tStates = useTranslations("AddBook.states");
  const id = useId();
  const [state, setState] = useState<ReadState>(status?.baseState ?? "planned");
  const [confirm, setConfirm] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const name = new FormData(event.currentTarget).get("name");
        onSave({ name: String(name ?? ""), base_state: state });
      }}
      className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          defaultValue={status?.name ?? ""}
          maxLength={CUSTOM_LIMITS.name}
          placeholder={t("namePlaceholder")}
          autoComplete="off"
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <ChoiceChips
        legend={t("state")}
        name={`${id}-state`}
        size="sm"
        options={READ_STATES}
        value={state}
        onChange={setState}
        label={(value) => tStates(value)}
      />
      <FormButtons
        pending={pending}
        saveLabel={t(status ? "save" : "create")}
        onCancel={onCancel}
        onDelete={onDelete}
        deleteLabel={t("delete")}
        confirmLabel={t("deleteConfirm")}
        confirm={confirm}
        setConfirm={setConfirm}
      />
    </form>
  );
}

/** Extra fields on every book: text, a number, a date, yes or no, or a choice. */
export function FieldsManager({ fields }: { fields: CustomField[] }) {
  const t = useTranslations("Custom.fields");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const { pending, error, run } = useRun();

  return (
    <div className="flex flex-col gap-4">
      {fields.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label={t("list")}>
          {fields.map((field) =>
            editing === field.id ? (
              <li key={field.id}>
                <FieldForm
                  field={field}
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSave={(values) =>
                    run(
                      () =>
                        updateFieldAction({ fieldId: field.id, field: values }),
                      () => setEditing(null),
                    )
                  }
                  onDelete={() =>
                    run(
                      () => deleteFieldAction({ fieldId: field.id }),
                      () => setEditing(null),
                    )
                  }
                />
              </li>
            ) : (
              <li
                key={field.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 px-4 py-2"
              >
                <span className="font-medium">{field.name}</span>
                <span className="min-w-0 truncate text-sm text-muted-foreground">
                  {t(`kinds.${field.kind}`)}
                  {field.kind === "choice" && `: ${field.options.join(", ")}`}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(field.id)}
                  aria-label={t("edit", { name: field.name })}
                  className="ml-auto grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Pencil className="size-3.5" aria-hidden />
                </button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {editing === "new" ? (
        <FieldForm
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(values) =>
            run(
              () => createFieldAction(values),
              () => setEditing(null),
            )
          }
        />
      ) : (
        <Button
          variant="outline"
          className="h-10 w-fit gap-1.5 rounded-xl"
          onClick={() => setEditing("new")}
        >
          <Plus className="size-4" aria-hidden />
          {t("add")}
        </Button>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

function FieldForm({
  field,
  pending,
  onSave,
  onCancel,
  onDelete,
}: {
  field?: CustomField;
  pending: boolean;
  onSave: (values: {
    name: string;
    kind: FieldKind;
    options: string[];
  }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("Custom.fields");
  const id = useId();
  const [kind, setKind] = useState<FieldKind>(field?.kind ?? "text");
  const [options, setOptions] = useState<string[]>(field?.options ?? []);
  const [confirm, setConfirm] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const name = new FormData(event.currentTarget).get("name");
        onSave({ name: String(name ?? ""), kind, options });
      }}
      className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          defaultValue={field?.name ?? ""}
          maxLength={CUSTOM_LIMITS.name}
          placeholder={t("namePlaceholder")}
          autoComplete="off"
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <ChoiceChips
        legend={t("kind")}
        name={`${id}-kind`}
        size="sm"
        options={FIELD_KINDS}
        value={kind}
        onChange={setKind}
        label={(value) => t(`kinds.${value}`)}
      />
      {kind === "choice" && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-options`} className="text-sm font-medium">
            {t("options")}
          </label>
          <TagInput
            id={`${id}-options`}
            values={options}
            onChange={setOptions}
            max={CUSTOM_LIMITS.options}
            maxLength={CUSTOM_LIMITS.option}
            placeholder={t("optionsPlaceholder")}
            fullPlaceholder={t("optionsFull")}
            removeLabel={(name) => t("removeOption", { name })}
          />
        </div>
      )}
      {field && field.kind !== kind && (
        <p className="text-sm text-muted-foreground">{t("kindChangeNote")}</p>
      )}
      <FormButtons
        pending={pending}
        saveLabel={t(field ? "save" : "create")}
        onCancel={onCancel}
        onDelete={onDelete}
        deleteLabel={t("delete")}
        confirmLabel={t("deleteConfirm")}
        confirm={confirm}
        setConfirm={setConfirm}
      />
    </form>
  );
}

function FormButtons({
  pending,
  saveLabel,
  onCancel,
  onDelete,
  deleteLabel,
  confirmLabel,
  confirm,
  setConfirm,
}: {
  pending: boolean;
  saveLabel: string;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel: string;
  confirmLabel: string;
  confirm: boolean;
  setConfirm: (confirm: boolean) => void;
}) {
  const t = useTranslations("Custom");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" disabled={pending} className="h-10 rounded-xl px-4">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {saveLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-10 rounded-xl px-4"
        onClick={onCancel}
      >
        {t("cancel")}
      </Button>
      {onDelete &&
        (confirm ? (
          <Button
            type="button"
            variant="destructive"
            className="ml-auto h-10 gap-1.5 rounded-xl px-4"
            disabled={pending}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
            {confirmLabel}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto h-10 gap-1.5 rounded-xl px-4 text-muted-foreground"
            onClick={() => setConfirm(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            {deleteLabel}
          </Button>
        ))}
    </div>
  );
}
