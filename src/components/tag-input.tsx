"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { springs } from "@/lib/motion";
import { uniqueNames } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * Chips typed into one box: Enter or comma adds, Backspace on an empty box
 * removes the last, × removes one. With `name`, each chip is also a hidden
 * form field.
 */
export function TagInput({
  id,
  name,
  values,
  onChange,
  max,
  maxLength,
  placeholder,
  fullPlaceholder,
  removeLabel,
  describedBy,
  invalid,
  chipClassName = "bg-amber/15 text-amber hover:[&_button]:bg-amber/20",
}: {
  id: string;
  name?: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  maxLength: number;
  placeholder: string;
  fullPlaceholder: string;
  removeLabel: (value: string) => string;
  describedBy?: string;
  invalid?: boolean;
  chipClassName?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = values.length >= max;

  function add(value: string) {
    onChange(uniqueNames([...values, value.slice(0, maxLength)]).slice(0, max));
  }

  function commit() {
    if (draft.trim()) add(draft);
    setDraft("");
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-input bg-background/60 p-2 focus-within:border-amber/60 focus-within:ring-3 focus-within:ring-ring/40",
        invalid && "border-destructive/60",
      )}
    >
      <AnimatePresence initial={false}>
        {values.map((value) => (
          <motion.span
            key={value}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={springs.snappy}
            className={cn(
              "inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm",
              chipClassName,
            )}
          >
            {value}
            {name && <input type="hidden" name={name} value={value} />}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={removeLabel(value)}
              className="rounded-full p-1 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        id={id}
        value={draft}
        disabled={full}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          } else if (event.key === "Backspace" && !draft && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={full ? fullPlaceholder : placeholder}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="h-8 min-w-36 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}
