/** Paths under this prefix require a signed-in user. */
export const PROTECTED_PREFIX = "/app";
export const LOGIN_PATH = "/login";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`)
  );
}

/** Only allow same-site relative redirects, never `//evil.com`, `/\evil.com` or absolute URLs. */
export function safeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return PROTECTED_PREFIX;
  }
  return next;
}

/** Absolute callback URL that returns the user to `next` after signing in. */
export function callbackUrl(origin: string, next?: string | null): string {
  const url = new URL(AUTH_CALLBACK_PATH, origin);
  url.searchParams.set("next", safeNextPath(next));
  return url.toString();
}
