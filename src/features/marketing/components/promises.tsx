import { Ban, Download, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal, RevealItem, RevealList } from "@/components/motion/reveal";

const PROMISES = [
  { key: "ads", icon: Ban },
  { key: "trackers", icon: EyeOff },
  { key: "control", icon: Download },
] as const;

export function Promises() {
  const t = useTranslations("Home.promises");

  return (
    <section
      aria-labelledby="promises-title"
      className="mx-auto w-full max-w-6xl px-6 py-12"
    >
      <Reveal className="rounded-[2rem] border border-teal/20 bg-gradient-to-br from-teal/10 via-card/60 to-lime/5 p-8 backdrop-blur-sm sm:p-10">
        <h2
          id="promises-title"
          className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          <span className="text-meadow">{t("title")}</span>
        </h2>
        <RevealList className="grid gap-6 sm:grid-cols-3">
          {PROMISES.map(({ key, icon: Icon }) => (
            <RevealItem key={key} className="flex gap-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-teal/15 text-teal">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-sans font-semibold">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(`items.${key}.body`)}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealList>
      </Reveal>
    </section>
  );
}
