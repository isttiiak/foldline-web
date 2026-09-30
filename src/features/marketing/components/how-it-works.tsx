import { BookPlus, LogIn, NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";

import { RevealItem, RevealList } from "@/components/motion/reveal";

import { SectionHeading } from "./section-heading";

const STEPS = [
  { key: "signIn", icon: LogIn },
  { key: "add", icon: BookPlus },
  { key: "log", icon: NotebookPen },
] as const;

export function HowItWorks() {
  const t = useTranslations("Home.how");

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="mx-auto flex w-full max-w-6xl scroll-mt-24 flex-col gap-12 px-6 py-20"
    >
      <SectionHeading id="how-title" title={t("title")} lead={t("lead")} />
      <RevealList ordered className="grid gap-5 md:grid-cols-3">
        {STEPS.map(({ key, icon: Icon }, i) => (
          <RevealItem key={key} className="relative">
            <div className="flex h-full hover-lift flex-col gap-3 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="inline-flex size-10 items-center justify-center rounded-full bg-sunrise font-heading text-lg font-semibold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <Icon className="size-5 text-amber" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`steps.${key}.body`)}
              </p>
            </div>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}
