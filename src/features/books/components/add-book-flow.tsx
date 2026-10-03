"use client";

import { BookOpen, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { BookCandidate } from "@/features/metadata/types";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { AddBookState } from "../schemas";
import { BookCover } from "./book-cover";
import { BookForm } from "./book-form";
import { FindBook } from "./find-book";

type Step =
  | { name: "find" }
  | { name: "form"; candidate: BookCandidate | null; isbn?: string }
  | {
      name: "added";
      result: Extract<AddBookState, { status: "added" }>;
      candidate: BookCandidate | null;
    };

const stepMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: springs.gentle,
};

/** A small celebration: the new book drops onto a shelf and settles. */
function Added({
  result,
  candidate,
  onAnother,
}: {
  result: Extract<AddBookState, { status: "added" }>;
  candidate: BookCandidate | null;
  onAnother: () => void;
}) {
  const t = useTranslations("AddBook.added");

  return (
    <div className="flex flex-col items-center gap-8 py-6 text-center">
      <div aria-hidden className="flex flex-col items-center">
        <motion.div
          className="w-28"
          initial={{ y: -60, rotate: -8, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={{ ...springs.bouncy, delay: 0.1 }}
        >
          <BookCover
            src={candidate?.coverUrl ?? null}
            title={result.title}
            author={candidate?.authors[0]}
            sizes="112px"
          />
        </motion.div>
        <motion.div
          className="mt-2 h-2 w-48 rounded-full bg-gradient-to-r from-transparent via-amber/50 to-transparent"
          initial={{ scaleX: 0.4, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ ...springs.gentle, delay: 0.25 }}
        />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-2xl font-semibold">
          {t("title", { title: result.title })}
        </h2>
        <p className="text-muted-foreground">{t("body")}</p>
        {!result.coverSaved && (
          <p className="text-sm text-amber">{t("coverNotSaved")}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/app"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 gap-2 rounded-xl px-5",
          )}
        >
          <BookOpen className="size-4" aria-hidden />
          {t("seeShelf")}
        </Link>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 gap-2 rounded-xl px-5"
          onClick={onAnother}
        >
          <Plus className="size-4" aria-hidden />
          {t("another")}
        </Button>
      </div>
    </div>
  );
}

/** Find → check and complete → added. */
export function AddBookFlow() {
  const [step, setStep] = useState<Step>({ name: "find" });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step.name === "find" && (
        <motion.div key="find" {...stepMotion}>
          <FindBook
            onPick={(candidate, isbn) =>
              setStep({ name: "form", candidate, isbn })
            }
          />
        </motion.div>
      )}
      {step.name === "form" && (
        <motion.div key="form" {...stepMotion}>
          <BookForm
            candidate={step.candidate}
            isbn={step.isbn}
            onBack={() => setStep({ name: "find" })}
            onDone={(result) =>
              setStep({ name: "added", result, candidate: step.candidate })
            }
          />
        </motion.div>
      )}
      {step.name === "added" && (
        <motion.div key="added" {...stepMotion}>
          <Added
            result={step.result}
            candidate={step.candidate}
            onAnother={() => setStep({ name: "find" })}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
