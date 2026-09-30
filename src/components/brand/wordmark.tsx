import Link from "next/link";
import { useTranslations } from "next-intl";

import { FoldMark } from "@/components/brand/fold-mark";
import { cn } from "@/lib/utils";

export function Wordmark({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  const t = useTranslations("Brand");

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex press items-center gap-2.5 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
        className,
      )}
    >
      <FoldMark
        label={t("markLabel")}
        className="size-8 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
      />
      <span className="font-heading text-xl font-semibold tracking-tight">
        {t("name")}
      </span>
    </Link>
  );
}
