import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { LOGIN_PATH } from "@/features/auth/paths";
import { Faq } from "@/features/marketing/components/faq";
import { Features } from "@/features/marketing/components/features";
import { FinalCta } from "@/features/marketing/components/final-cta";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { Promises } from "@/features/marketing/components/promises";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Home");
  return { title: { absolute: t("metaTitle") }, description: t("lead") };
}

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <>
      <Hero
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        note={t("ctaNote")}
        illustrationLabel={t("illustrationLabel")}
      >
        <GoogleSignInButton label={t("ctaGoogle")} className="sm:w-auto" />
        <Link
          href={LOGIN_PATH}
          className="inline-flex h-12 press items-center justify-center rounded-xl px-5 font-medium whitespace-nowrap text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {t("ctaSignIn")}
        </Link>
      </Hero>
      <Features />
      <HowItWorks />
      <Promises />
      <Faq />
      <FinalCta />
    </>
  );
}
