import { z } from "zod";

export const magicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  next: z.string().optional(),
});

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; reason: "invalidEmail" | "generic" };
