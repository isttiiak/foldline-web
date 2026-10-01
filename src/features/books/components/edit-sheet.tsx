"use client";

import { useTranslations } from "next-intl";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** A side panel for an edit form: full width on a phone, roomy on a desktop. */
export function EditSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Common");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t("close")}
        className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border/70 px-6 pt-6 pb-4 sm:px-8">
          <SheetTitle className="text-2xl font-semibold">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="px-6 py-6 sm:px-8">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
