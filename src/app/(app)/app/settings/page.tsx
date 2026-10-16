import {
  ArrowRight,
  Download,
  FileUp,
  ListChecks,
  SlidersHorizontal,
  Star,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { DeleteAccountForm } from "@/features/account/components/delete-account-form";
import {
  FieldsManager,
  RatingScalePicker,
  StatusesManager,
} from "@/features/custom/components/library-setup";
import {
  getCustomFields,
  getCustomStatuses,
} from "@/features/custom/server/queries";
import { getProfile } from "@/features/profile/server/queries";
import { InstallApp } from "@/features/pwa/components/install-app";
import { requireUser } from "@/lib/auth";
import { SOURCE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("metaTitle") };
}

function Card({
  icon: Icon,
  title,
  id,
  tone = "default",
  children,
}: {
  icon: typeof UserRound;
  title: string;
  /** A stable anchor (otherwise made from the title). */
  id?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const titleId = id ?? `settings-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section
      id={id ? `${id}-section` : undefined}
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
  const [profile, statuses, fields] = await Promise.all([
    getProfile(),
    getCustomStatuses(),
    getCustomFields(),
  ]);

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
        <div>
          <Link
            href="/app/profile"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 gap-2 rounded-xl px-4",
            )}
          >
            {t("account.editProfile")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Card>

      <Card icon={Star} title={t("ratings.title")} id="settings-ratings">
        <p className="leading-relaxed text-muted-foreground">
          {t("ratings.body")}
        </p>
        <RatingScalePicker scale={profile?.ratingScale ?? "half-stars"} />
      </Card>

      <Card
        icon={ListChecks}
        title={t("statuses.title")}
        id="settings-custom-statuses"
      >
        <p className="leading-relaxed text-muted-foreground">
          {t("statuses.body")}
        </p>
        <StatusesManager statuses={statuses} />
      </Card>

      <Card
        icon={SlidersHorizontal}
        title={t("fields.title")}
        id="settings-custom-fields"
      >
        <p className="leading-relaxed text-muted-foreground">
          {t("fields.body")}
        </p>
        <FieldsManager fields={fields} />
      </Card>

      <Card icon={Smartphone} title={t("app.title")}>
        <p className="leading-relaxed text-muted-foreground">{t("app.body")}</p>
        <InstallApp />
      </Card>

      <Card icon={FileUp} title={t("import.title")}>
        <p className="leading-relaxed text-muted-foreground">
          {t("import.body")}
        </p>
        <div>
          <Link
            href="/app/import"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 gap-2 rounded-xl px-4",
            )}
          >
            <FileUp className="size-4" aria-hidden />
            {t("import.open")}
          </Link>
        </div>
      </Card>

      <Card icon={Download} title={t("data.title")}>
        <p className="leading-relaxed text-muted-foreground">
          {t("data.body")}
        </p>
        {/* Plain links: the route answers with a file download. */}
        <ul className="flex flex-col gap-3">
          {(
            [
              ["json", "/app/settings/export"],
              ["csv", "/app/settings/export?format=csv"],
              ["markdown", "/app/settings/export?format=markdown"],
            ] as const
          ).map(([format, href]) => (
            <li
              key={format}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">
                  {t(`data.formats.${format}.title`)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(`data.formats.${format}.body`)}
                </span>
              </div>
              <a
                href={href}
                download
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-10 gap-2 rounded-xl px-4",
                )}
              >
                <Download className="size-4" aria-hidden />
                {t(`data.formats.${format}.download`)}
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card icon={Trash2} title={t("delete.title")} tone="danger">
        <p className="leading-relaxed text-muted-foreground">
          {t("delete.body")}
        </p>
        <DeleteAccountForm email={user.email} />
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        {t.rich("source", {
          link: (chunks) => (
            <a
              href={SOURCE_URL}
              rel="noopener noreferrer"
              className="rounded-sm text-amber underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
}
