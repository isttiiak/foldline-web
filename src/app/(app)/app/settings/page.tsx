import { Download, ShieldCheck, Trash2, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { DeleteAccountForm } from "@/features/account/components/delete-account-form";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("metaTitle") };
}

function Card({
  icon: Icon,
  title,
  tone = "default",
  children,
}: {
  icon: typeof UserRound;
  title: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const titleId = `settings-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-4 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm sm:p-8",
        tone === "danger" && "border-destructive/25",
      )}
    >
      <h2
        id={titleId}
        className="flex items-center gap-3 text-xl font-semibold"
      >
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-2xl",
            tone === "danger"
              ? "bg-destructive/15 text-destructive"
              : "bg-amber/15 text-amber",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getTranslations("Settings");

  return (
    <div className="flex flex-1 flex-col gap-8">
      <h1 className="text-4xl font-semibold tracking-tight">
        <span className="text-sunrise">{t("title")}</span>
      </h1>

      <Card icon={UserRound} title={t("account.title")}>
        <p>
          <span className="text-muted-foreground">
            {t("account.signedInAs")}
          </span>{" "}
          <span className="font-medium break-all">{user.email}</span>
        </p>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-teal"
            aria-hidden
          />
          {t("account.provider")}
        </p>
      </Card>

      <Card icon={Download} title={t("data.title")}>
        <p className="leading-relaxed text-muted-foreground">
          {t("data.body")}
        </p>
        <div>
          {/* A plain link: the route answers with a file download. */}
          <a
            href="/app/settings/export"
            download
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 gap-2 rounded-xl px-4",
            )}
          >
            <Download className="size-4" aria-hidden />
            {t("data.download")}
          </a>
        </div>
      </Card>

      <Card icon={Trash2} title={t("delete.title")} tone="danger">
        <p className="leading-relaxed text-muted-foreground">
          {t("delete.body")}
        </p>
        <DeleteAccountForm email={user.email} />
      </Card>
    </div>
  );
}
