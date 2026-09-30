import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { FoldMark } from "@/components/brand/fold-mark";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNextPath } from "@/features/auth/paths";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Login");
  return { title: t("metaTitle") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const t = await getTranslations("Login");
  const b = await getTranslations("Brand");
  const next =
    typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  const error =
    params.error === "link" || params.error === "google"
      ? params.error
      : undefined;

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-8 rounded-[2rem] border bg-card/70 p-8 shadow-[0_30px_80px_-40px_rgb(240_122_90/0.45)] backdrop-blur-md sm:p-10">
        <FoldMark label={b("markLabel")} animated className="size-14" />
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-sunrise">{t("title")}</span>
          </h1>
          <p className="text-muted-foreground">{t("lead")}</p>
        </div>
        <LoginForm next={next} linkError={error} />
      </div>
    </section>
  );
}
