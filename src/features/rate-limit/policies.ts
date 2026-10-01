/*
 * Rate limit policies, generous for people and tight enough to stop abuse.
 * Windows are fixed (counted per whole window) and at most one day long.
 */

export type RateLimitPolicy = {
  name: string;
  limit: number;
  windowSeconds: number;
  /**
   * What the subject is: a signed-in user id, the caller's (hashed) IP or email, or
   * one shared counter for everyone (outgoing provider budgets).
   */
  per: "user" | "ip" | "email" | "global";
};

export const RATE_LIMITS = {
  googleSignIn: {
    name: "google-sign-in",
    per: "ip",
    limit: 20,
    windowSeconds: 600,
  },
  magicLinkIp: { name: "magic-link", per: "ip", limit: 5, windowSeconds: 3600 },
  magicLinkEmail: {
    name: "magic-link",
    per: "email",
    limit: 3,
    windowSeconds: 3600,
  },
  authCallback: {
    name: "auth-callback",
    per: "ip",
    limit: 30,
    windowSeconds: 600,
  },
  authSession: {
    name: "auth-session",
    per: "ip",
    limit: 20,
    windowSeconds: 600,
  },
  exportData: {
    name: "export-data",
    per: "user",
    limit: 10,
    windowSeconds: 3600,
  },
  deleteAccount: {
    name: "delete-account",
    per: "user",
    limit: 5,
    windowSeconds: 3600,
  },
  profileUpdate: {
    name: "profile-update",
    per: "user",
    limit: 30,
    windowSeconds: 600,
  },
  addBook: {
    name: "add-book",
    per: "user",
    limit: 60,
    windowSeconds: 600,
  },
  metadataLookup: {
    name: "metadata-lookup",
    per: "user",
    limit: 120,
    windowSeconds: 600,
  },
  // Open Library allows 3 requests per second from an identified app.
  openLibrary: {
    name: "openlibrary",
    per: "global",
    limit: 3,
    windowSeconds: 1,
  },
  googleBooks: {
    name: "googlebooks",
    per: "global",
    limit: 10,
    windowSeconds: 1,
  },
} as const satisfies Record<string, RateLimitPolicy>;

/** The single subject of a `per: "global"` policy. */
export const GLOBAL_SUBJECT = "all";

/** The counter key: `name:per:subject`. The subject is already hashed if sensitive. */
export function bucketFor(policy: RateLimitPolicy, subject: string): string {
  return `${policy.name}:${policy.per}:${subject}`.slice(0, 200);
}

/**
 * The caller's IP from proxy headers. On Vercel `x-forwarded-for` is set by the
 * platform (the first entry is the client). Falls back to a shared bucket.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
