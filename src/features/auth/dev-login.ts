import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/*
 * Dev-only sign-in for automated tests (`/auth/dev-login`). It can only ever
 * sign in throwaway users on this domain, never a real account.
 */
export const DEV_LOGIN_PATH = "/auth/dev-login";
export const DEV_LOGIN_HEADER = "x-dev-login-secret";
export const DEV_LOGIN_EMAIL_DOMAIN = "foldline.test";

export const devLoginBodySchema = z.object({
  email: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,62}@foldline\.test$/, "not a test email"),
});

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

type DevLoginGuard = {
  nodeEnv: string | undefined;
  hostname: string;
  /** DEV_LOGIN_SECRET from the server environment, null when unset or too short. */
  secret: string | null;
  /** The secret the caller sent in the header. */
  provided: string | null;
};

/** True only in development, on localhost, with the right secret. */
export function devLoginAllowed({
  nodeEnv,
  hostname,
  secret,
  provided,
}: DevLoginGuard): boolean {
  if (nodeEnv === "production") return false;
  if (!LOCAL_HOSTS.has(hostname)) return false;
  if (!secret || !provided) return false;
  // Hash first so both sides have equal length for the constant-time compare.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(secret), digest(provided));
}
