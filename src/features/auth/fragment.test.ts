import { describe, expect, test } from "vitest";

import { parseAuthFragment } from "./fragment";

describe("parseAuthFragment", () => {
  test("reads tokens from an implicit-flow fragment", () => {
    expect(
      parseAuthFragment(
        "#access_token=aaa.bbb.ccc&expires_in=3600&refresh_token=rrr&token_type=bearer&type=invite",
      ),
    ).toEqual({
      kind: "tokens",
      accessToken: "aaa.bbb.ccc",
      refreshToken: "rrr",
    });
  });

  test("reports an expired or invalid link", () => {
    expect(
      parseAuthFragment(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
      ),
    ).toEqual({ kind: "error" });
  });

  test.each(["", "#", "#main", "#access_token=only"])(
    "ignores unrelated fragment %j",
    (hash) => {
      expect(parseAuthFragment(hash)).toBeNull();
    },
  );
});
