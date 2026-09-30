import { describe, expect, test } from "vitest";

import { isLoginError, loginErrorFromParams } from "./errors";

const params = (query: string) => new URLSearchParams(query);

describe("loginErrorFromParams", () => {
  test("no error params -> null", () => {
    expect(loginErrorFromParams(params("code=abc&next=%2Fapp"))).toBeNull();
  });

  test("uninvited Google account -> notInvited", () => {
    expect(
      loginErrorFromParams(
        params(
          "error=access_denied&error_code=signup_disabled&error_description=Signups+not+allowed+for+this+instance",
        ),
      ),
    ).toBe("notInvited");
    expect(
      loginErrorFromParams(
        params(
          "error=server_error&error_description=Signups+not+allowed+for+otp",
        ),
      ),
    ).toBe("notInvited");
  });

  test("expired email link -> link", () => {
    expect(
      loginErrorFromParams(
        params(
          "error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
        ),
      ),
    ).toBe("link");
  });

  test("anything else from the provider -> google", () => {
    expect(
      loginErrorFromParams(
        params("error=access_denied&error_description=User+cancelled"),
      ),
    ).toBe("google");
  });
});

test("isLoginError guards query values", () => {
  expect(isLoginError("notInvited")).toBe(true);
  expect(isLoginError("<script>")).toBe(false);
  expect(isLoginError(["link"])).toBe(false);
});
