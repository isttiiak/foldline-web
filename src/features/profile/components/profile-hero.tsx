"use client";

import {
  BookOpen,
  CalendarHeart,
  Clock,
  Headphones,
  Mail,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";

import { springs } from "@/lib/motion";

import type { EditionFormat } from "../schemas";
import { UserAvatar } from "./user-avatar";

export type ProfileHeroProps = {
  displayName: string | null;
  email: string | null;
  avatarSrc: string | null;
  bio: string | null;
  timezone: string;
  memberSince: string;
  booksOnShelf: number;
  preferredFormats: EditionFormat[];
  favouriteGenres: string[];
};

function Chip({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <li className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-background/50 px-3 py-1.5 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0 text-amber" aria-hidden />
      <span className="truncate">{children}</span>
    </li>
  );
}

/** The top of the profile: a warm banner with a folded corner, the photo and the essentials. */
export function ProfileHero(props: ProfileHeroProps) {
  const t = useTranslations("Profile.hero");
  const tFormats = useTranslations("Profile.formats");
  const format = useFormatter();
  const name = props.displayName ?? t("unnamed");

  return (
    // CSS entrance (starts dimmed, never hidden), so the page reads before hydration.
    <section
      aria-labelledby="profile-name"
      className="relative enter overflow-hidden rounded-3xl border bg-card/70 backdrop-blur-sm"
    >
      {/* Banner: sunrise gradient, soft light, and a folded page corner. */}
      <div
        aria-hidden
        className="relative h-32 bg-[linear-gradient(120deg,var(--amber),var(--coral)_45%,var(--rose))] sm:h-40"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(255_255_255/0.35),transparent_45%),radial-gradient(circle_at_85%_90%,rgb(60_198_168/0.35),transparent_40%)]" />
        <div className="absolute top-0 right-0 size-14 bg-[linear-gradient(225deg,var(--card)_50%,rgb(0_0_0/0.18)_50%)] sm:size-16" />
      </div>

      <div className="relative flex flex-col gap-6 px-6 pb-7 sm:px-8">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:gap-6">
          <motion.div
            whileHover={{ rotate: -3, scale: 1.03 }}
            transition={springs.bouncy}
            className="w-fit rounded-full bg-[linear-gradient(135deg,var(--amber),var(--rose),var(--teal))] p-1 shadow-[0_18px_40px_-16px_rgb(240_122_90/0.7)]"
          >
            <UserAvatar
              src={props.avatarSrc}
              name={name}
              size={120}
              className="ring-4 ring-card"
            />
          </motion.div>
          <div className="flex min-w-0 flex-col gap-1 pb-1">
            <h2
              id="profile-name"
              className="truncate text-3xl font-semibold tracking-tight"
            >
              {name}
            </h2>
            {props.email && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{props.email}</span>
              </p>
            )}
          </div>
        </div>

        <ul className="flex flex-wrap gap-2" aria-label={t("detailsLabel")}>
          <Chip icon={CalendarHeart}>
            {t("memberSince", {
              date: format.dateTime(new Date(props.memberSince), {
                month: "long",
                year: "numeric",
              }),
            })}
          </Chip>
          <Chip icon={BookOpen}>
            {t("booksOnShelf", { count: props.booksOnShelf })}
          </Chip>
          <Chip icon={Clock}>{props.timezone.replaceAll("_", " ")}</Chip>
        </ul>

        <p className="max-w-2xl leading-relaxed whitespace-pre-line">
          {props.bio ?? (
            <span className="text-muted-foreground">{t("noBio")}</span>
          )}
        </p>

        {(props.favouriteGenres.length > 0 ||
          props.preferredFormats.length > 0) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
            {props.preferredFormats.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Headphones className="size-3.5" aria-hidden />
                  {t("formats")}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {props.preferredFormats.map((value) => (
                    <li
                      key={value}
                      className="rounded-full bg-teal/15 px-3 py-1 text-sm text-teal"
                    >
                      {tFormats(value)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {props.favouriteGenres.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Sparkles className="size-3.5" aria-hidden />
                  {t("genres")}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {props.favouriteGenres.map((genre) => (
                    <li
                      key={genre}
                      className="rounded-full bg-amber/15 px-3 py-1 text-sm text-amber"
                    >
                      {genre}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
