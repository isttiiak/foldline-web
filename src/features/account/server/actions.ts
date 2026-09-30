"use server";

import { redirect } from "next/navigation";

import {
  confirmMatches,
  deleteAccountSchema,
  type DeleteAccountState,
} from "@/features/account/schemas";
import { LOGIN_PATH } from "@/features/auth/paths";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/features/rate-limit/server/rate-limit";
import { deleteAccount, getSessionUser } from "@/lib/auth";

const GOODBYE_PATH = "/goodbye";

/** Delete the signed-in user's account and all their data, after typed confirmation. */
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);

  const limit = await rateLimit(RATE_LIMITS.deleteAccount, user.id);
  if (!limit.ok) return { status: "error", reason: "rateLimited" };

  const parsed = deleteAccountSchema.safeParse({
    confirm: formData.get("confirm"),
  });
  if (!parsed.success || !confirmMatches(parsed.data.confirm, user.email)) {
    return { status: "error", reason: "mismatch" };
  }

  const result = await deleteAccount(user.id);
  if (!result.ok) {
    console.error("[account] delete failed:", result.error);
    return { status: "error", reason: "generic" };
  }
  redirect(GOODBYE_PATH);
}
