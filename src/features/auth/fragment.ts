import { loginErrorFromParams, type LoginError } from "./errors";

export type FragmentAuth =
  | { kind: "tokens"; accessToken: string; refreshToken: string }
  | { kind: "error"; error: LoginError }
  | null;

/**
 * Parse the `#access_token=...` or `#error=...` fragment Supabase appends after
 * verifying an email link with the implicit flow. Returns null for anything else.
 */
export function parseAuthFragment(hash: string): FragmentAuth {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const error = loginErrorFromParams(params);
  if (error) return { kind: "error", error };

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    return { kind: "tokens", accessToken, refreshToken };
  }
  return null;
}
