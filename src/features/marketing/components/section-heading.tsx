import { Reveal } from "@/components/motion/reveal";

/** Centered section title with an optional lead, revealed on scroll. */
export function SectionHeading({
  id,
  title,
  lead,
}: {
  id: string;
  title: string;
  lead?: string;
}) {
  return (
    <Reveal className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
      <h2
        id={id}
        className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
      >
        {title}
      </h2>
      {lead && (
        <p className="text-lg leading-relaxed text-muted-foreground">{lead}</p>
      )}
    </Reveal>
  );
}
