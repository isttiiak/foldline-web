import { BookIllustration } from "./book-illustration";

type HeroProps = {
  eyebrow: string;
  title: string;
  lead: string;
  note: string;
  illustrationLabel: string;
  /** Call-to-action buttons and links. */
  children: React.ReactNode;
};

/** Staggered CSS entrance: rendered on the server, visible before hydration. */
function delay(step: number): React.CSSProperties {
  return { "--enter-delay": `${100 + step * 110}ms` } as React.CSSProperties;
}

export function Hero({
  eyebrow,
  title,
  lead,
  note,
  illustrationLabel,
  children,
}: HeroProps) {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pt-8 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
      <div className="flex flex-col items-start gap-6">
        <p
          style={delay(0)}
          className="enter rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-sm font-medium text-amber"
        >
          {eyebrow}
        </p>
        <h1
          style={delay(1)}
          className="max-w-3xl enter text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl"
        >
          <span className="text-sunrise motion-safe:animate-shimmer">
            {title}
          </span>
        </h1>
        <p
          style={delay(2)}
          className="max-w-xl enter text-lg leading-relaxed text-muted-foreground"
        >
          {lead}
        </p>
        <div
          style={delay(3)}
          className="flex w-full enter flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          {children}
        </div>
        <p style={delay(4)} className="enter text-sm text-muted-foreground">
          {note}
        </p>
      </div>
      <div style={delay(2)} className="enter">
        <BookIllustration label={illustrationLabel} />
      </div>
    </section>
  );
}
