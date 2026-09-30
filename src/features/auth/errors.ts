export const LOGIN_ERRORS = ["link", "google", "notInvited"] as const;
export type LoginError = (typeof LOGIN_ERRORS)[number];

export function isLoginError(value: unknown): value is LoginError {
  return (
    typeof value === "string" &&
    (LOGIN_ERRORS as readonly string[]).includes(value)
  );
}

/**
 * Map the error Supabase sends back (as query or fragment params) to a message
 * key. Invite-only: a Google account nobody invited gets "Signups not allowed".
 */
export function loginErrorFromParams(
  params: URLSearchParams,
): LoginError | null {
  const code = params.get("error_code");
  const error = params.get("error");
  const description = params.get("error_description") ?? "";
  if (!code && !error) return null;

  if (/signups? not allowed|signup_disabled/i.test(`${code} ${description}`)) {
    return "notInvited";
  }
  if (code === "otp_expired" || /email link/i.test(description)) return "link";
  return "google";
}
