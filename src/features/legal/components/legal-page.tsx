import { getTranslations } from "next-intl/server";

/** Bump when the privacy policy or terms change in a way that matters. */
export const LEGAL_UPDATED = "1 October 2026";
export const CONTACT_EMAIL = "isttiiak@gmail.com";

type LegalSection = { title: string; body: string[] };

/** Plain-language legal page (privacy or terms): title, contents list, sections, contact. */
export async function LegalPage({
  namespace,
}: {
  namespace: "Privacy" | "Terms";
}) {
  const t = await getTranslations(namespace);
  const l = await getTranslations("Legal");
  // `t.raw` is typed for leaf keys only; `sections` is a whole object here.
  const raw = t.raw as (key: string) => unknown;
  const sections = Object.entries(
    raw("sections") as Record<string, LegalSection>,
  );

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {l("updated", { date: LEGAL_UPDATED })}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          {t("lead")}
        </p>
      </header>

      <nav
        aria-labelledby="legal-contents"
        className="rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
      >
        <h2
          id="legal-contents"
          className="mb-3 font-sans text-sm font-semibold tracking-widest text-muted-foreground uppercase"
        >
          {l("contents")}
        </h2>
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {sections.map(([id, section]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="rounded-sm text-foreground/90 underline-offset-4 hover:text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map(([id, section]) => (
        <section
          key={id}
          id={id}
          aria-labelledby={`${id}-title`}
          className="flex scroll-mt-8 flex-col gap-3"
        >
          <h2 id={`${id}-title`} className="text-2xl font-semibold">
            {section.title}
          </h2>
          {section.body.map((paragraph, i) => (
            <p key={i} className="leading-relaxed text-foreground/85">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <p className="rounded-3xl border border-amber/20 bg-amber/10 p-6 leading-relaxed">
        {l("contactLead")}{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="rounded-sm font-medium text-amber underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}
