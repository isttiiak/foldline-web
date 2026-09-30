import { useTranslations } from "next-intl";

import { FoldMark } from "@/components/brand/fold-mark";
import { Reveal } from "@/components/motion/reveal";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

export function FinalCta() {
  const t = useTranslations("Home");
  const b = useTranslations("Brand");

  return (
    <section
      aria-labelledby="final-cta-title"
      className="mx-auto w-full max-w-6xl px-6 pt-8 pb-20"
    >
      <Reveal className="flex flex-col items-center gap-6 rounded-[2rem] border bg-card/70 px-6 py-14 text-center shadow-[0_30px_80px_-40px_rgb(240_122_90/0.45)] backdrop-blur-md">
        <FoldMark label={b("markLabel")} animated className="size-14" />
        <h2
          id="final-cta-title"
          className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          <span className="text-sunrise">{t("final.title")}</span>
        </h2>
        <p className="max-w-md text-muted-foreground">{t("final.body")}</p>
        <GoogleSignInButton
          label={t("ctaGoogle")}
          className="w-full max-w-xs"
        />
      </Reveal>
    </section>
  );
}
