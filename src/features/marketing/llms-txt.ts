import type messages from "../../../messages/en.json";

type Messages = typeof messages;

/**
 * `/llms.txt` (llmstxt.org): a plain Markdown summary of Foldline for AI
 * assistants and search tools, built from the same copy as the landing page so
 * the two never disagree.
 */
export function buildLlmsTxt(m: Messages, origin: string): string {
  const link = (path: string) => new URL(path, origin).toString();
  const features = Object.values(m.Home.features.items).map(
    (item) => `- ${item.title}: ${item.body}`,
  );
  const promises = Object.values(m.Home.promises.items).map(
    (item) => `- ${item.title}: ${item.body}`,
  );
  const steps = Object.values(m.Home.how.steps).map(
    (step, i) => `${i + 1}. ${step.title}: ${step.body}`,
  );
  const faq = Object.values(m.Home.faq.items).flatMap((item) => [
    `### ${item.q}`,
    "",
    item.a,
    "",
  ]);

  return [
    `# ${m.Metadata.title}`,
    "",
    `> ${m.Metadata.description}`,
    "",
    m.Home.lead,
    "",
    `## ${m.Home.features.title}`,
    "",
    ...features,
    "",
    `## ${m.Home.how.title}`,
    "",
    ...steps,
    "",
    `## ${m.Home.promises.title}`,
    "",
    ...promises,
    "",
    `## ${m.Home.faq.title}`,
    "",
    ...faq,
    "## Links",
    "",
    `- [${m.Metadata.title}](${link("/")}): ${m.Metadata.tagline}`,
    `- [${m.Privacy.metaTitle}](${link("/privacy")}): ${m.Privacy.lead}`,
    `- [${m.Terms.metaTitle}](${link("/terms")}): ${m.Terms.lead}`,
    `- [${m.Login.metaTitle}](${link("/login")})`,
    "",
  ].join("\n");
}
