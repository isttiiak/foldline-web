/** Shared look for text inputs, selects and textareas in app forms. */
export const fieldClass =
  "w-full rounded-xl border border-input bg-background/60 px-4 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-amber/60 focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive/60";

/**
 * A labelled form field with an optional hint (`<id>-hint`) and error
 * (`<id>-error`) for the control's `aria-describedby`. `action` sits beside the
 * label (a small toggle, for example).
 */
export function Field({
  id,
  label,
  hint,
  error,
  action,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {action ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          {action}
        </div>
      ) : (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {hint && (
        <div id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
