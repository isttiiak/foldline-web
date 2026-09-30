import {
  ChartColumn,
  Headphones,
  LockKeyhole,
  PartyPopper,
  Ruler,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { RevealItem, RevealList } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

const FEATURES = [
  {
    key: "formats",
    icon: Headphones,
    tint: "from-amber/25 to-coral/10 text-amber",
  },
  { key: "units", icon: Ruler, tint: "from-coral/25 to-rose/10 text-coral" },
  {
    key: "goals",
    icon: PartyPopper,
    tint: "from-rose/25 to-amber/10 text-rose",
  },
  {
    key: "stats",
    icon: ChartColumn,
    tint: "from-teal/25 to-lime/10 text-teal",
  },
  {
    key: "private",
    icon: LockKeyhole,
    tint: "from-lime/25 to-teal/10 text-lime",
  },
  { key: "ai", icon: Sparkles, tint: "from-amber/20 to-teal/10 text-amber" },
] as const satisfies readonly {
  key: string;
  icon: LucideIcon;
  tint: string;
}[];

export function Features() {
  const t = useTranslations("Home.features");

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="mx-auto flex w-full max-w-6xl scroll-mt-24 flex-col gap-12 px-6 py-20"
    >
      <SectionHeading id="features-title" title={t("title")} lead={t("lead")} />
      <RevealList className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, icon: Icon, tint }) => (
          <RevealItem key={key}>
            <article className="h-full hover-lift rounded-3xl border bg-card/70 p-6 backdrop-blur-sm hover:border-amber/25">
              <span
                className={cn(
                  "mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br",
                  tint,
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                {t(`items.${key}.title`)}
                {key === "ai" && (
                  <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 font-sans text-xs font-medium text-teal">
                    {t("soon")}
                  </span>
                )}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`items.${key}.body`)}
              </p>
            </article>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}
