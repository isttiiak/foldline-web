import { Camera, Lock, PenLine } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AvatarEditor } from "@/features/profile/components/avatar-editor";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { ProfileHero } from "@/features/profile/components/profile-hero";
import { timeZones } from "@/features/profile/schemas";
import { getProfile } from "@/features/profile/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: t("metaTitle") };
}

function Card({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: typeof PenLine;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-6 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm sm:p-8"
    >
      <h2 id={id} className="flex items-center gap-3 text-xl font-semibold">
        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-amber/15 text-amber">
          <Icon className="size-5" aria-hidden />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const t = await getTranslations("Profile");
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <p role="alert" className="text-muted-foreground">
          {t("unavailable")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="size-4 text-teal" aria-hidden />
          {t("private")}
        </p>
      </div>

      <ProfileHero
        displayName={profile.displayName}
        email={profile.email}
        avatarSrc={profile.avatarSrc}
        bio={profile.bio}
        timezone={profile.timezone}
        memberSince={profile.memberSince}
        booksOnShelf={profile.booksOnShelf}
        preferredFormats={profile.preferredFormats}
        favouriteGenres={profile.favouriteGenres}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Card icon={PenLine} title={t("form.title")} id="profile-details">
          <ProfileForm
            initial={{
              displayName: profile.displayName,
              bio: profile.bio,
              timezone: profile.timezone,
              preferredFormats: profile.preferredFormats,
              favouriteGenres: profile.favouriteGenres,
            }}
            timeZones={timeZones()}
          />
        </Card>
        <Card icon={Camera} title={t("photo.title")} id="profile-photo">
          <AvatarEditor
            avatarSrc={profile.avatarSrc}
            name={profile.displayName}
            hasOwnPhoto={profile.hasOwnPhoto}
            hasProviderPhoto={profile.hasProviderPhoto}
          />
        </Card>
      </div>
    </div>
  );
}
