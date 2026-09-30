import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { RevealItem, RevealList } from "@/components/motion/reveal";

import { SectionHeading } from "./section-heading";

const QUESTIONS = [
  "free",
  "data",
  "formats",
  "stop",
  "google",
  "leave",
] as const;

/** Native <details> accordion: keyboard and screen-reader friendly without JS. */
export function Faq() {
  const t = useTranslations("Home.faq");

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto flex w-full max-w-3xl scroll-mt-24 flex-col gap-10 px-6 py-20"
    >
      <SectionHeading id="faq-title" title={t("title")} />
      <RevealList className="flex flex-col gap-3">
        {QUESTIONS.map((key) => (
          <RevealItem key={key}>
            <details className="group rounded-2xl border bg-card/60 backdrop-blur-sm transition-colors open:border-amber/25 open:bg-card/80">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                {t(`items.${key}.q`)}
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-amber transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-muted-foreground">
                {t(`items.${key}.a`)}
              </p>
            </details>
          </RevealItem>
        ))}
      </RevealList>
    </section>
  );
}
