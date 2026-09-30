import { z } from "zod";

export const deleteAccountSchema = z.object({
  confirm: z.string().trim().min(1).max(320),
});

/** The typed confirmation must be the account email (case and spaces ignored). */
export function confirmMatches(
  typed: string,
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return typed.trim().toLowerCase() === email.trim().toLowerCase();
}

export type DeleteAccountState =
  { status: "idle" } | { status: "error"; reason: "mismatch" | "generic" };
