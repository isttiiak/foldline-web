import { parseFindInput } from "@/features/books/parse-input";

/** What another app sent with "Share": any of a title, some text and a link. */
export type SharedPayload = {
  title?: string | null;
  text?: string | null;
  url?: string | null;
};

const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/gi;
/** Words apps put around a shared title ("Check out ... on Goodreads"). */
const FILLER =
  /^(?:check out|have a look at|look at|i'?m reading|reading)\s+|\s+(?:on|via|from)\s+(?:goodreads|amazon|google books|open ?library|storygraph|the storygraph)\.?$/gi;
const MAX = 200;

function clean(text: string): string {
  return text
    .replace(URL_IN_TEXT, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(FILLER, "")
    .replace(/^["'“”‘’]+|["'“”‘’.:,-]+$/g, "")
    .trim();
}

/**
 * Turn a share into what goes in the "Find your book" box: a link or ISBN that
 * names the book exactly if there is one, otherwise the shared words as a
 * search. Null when nothing useful came along.
 */
export function sharedFindText(shared: SharedPayload): string | null {
  const text = shared.text?.trim() ?? "";
  const title = shared.title?.trim() ?? "";
  const links = [
    ...(shared.url?.trim() ? [shared.url.trim()] : []),
    ...(text.match(URL_IN_TEXT) ?? []),
  ];

  for (const link of links) {
    if (parseFindInput(link).kind === "isbn") return link.slice(0, 2000);
  }
  for (const word of `${title} ${text}`.split(/[^\dXx-]+/)) {
    if (parseFindInput(word).kind === "isbn") return word;
  }

  const words = clean(text) || clean(title);
  if (words.length >= 2) return words.slice(0, MAX);
  return links[0]?.slice(0, 2000) ?? null;
}
