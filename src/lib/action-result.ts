import type { z } from "zod";

/** Why a server action did not do what was asked, beyond its own reasons. */
export type CommonReason = "invalid" | "generic" | "rateLimited";

/**
 * What a server action returns: its own success shape, or an expected error
 * (never a throw) with the form fields that need another look.
 */
export type ActionResult<
  Ok extends { status: string } = { status: "saved" },
  Reason extends string = never,
> = Ok | { status: "error"; reason: CommonReason | Reason; fields?: string[] };

/** The top-level fields a failed parse complains about, each once. */
export function invalidFields(error: z.ZodError): string[] {
  return [
    ...new Set(
      error.issues.flatMap((issue) =>
        typeof issue.path[0] === "string" ? [issue.path[0]] : [],
      ),
    ),
  ];
}
