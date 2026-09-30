import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { LoginForm } from "./login-form";

vi.mock("@/features/auth/server/actions", () => ({
  requestMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

describe("LoginForm", () => {
  test("shows only Google sign-in by default, with an invite-only note", () => {
    renderWithIntl(<LoginForm />);

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("can show the magic link form again when enabled", () => {
    renderWithIntl(<LoginForm methods={{ google: true, magicLink: true }} />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(
      screen.getByRole("button", { name: "Send me a magic link" }),
    ).toBeInTheDocument();
  });

  test.each([
    ["link", /expired/],
    ["notInvited", /not on the guest list/],
    ["google", /Google sign-in did not work/],
  ] as const)("explains the %s error gently", (error, text) => {
    renderWithIntl(<LoginForm linkError={error} />);
    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });

  test("carries the next path into the Google form", () => {
    const { container } = renderWithIntl(<LoginForm next="/app/shelves" />);
    expect(container.querySelector('input[name="next"]')).toHaveValue(
      "/app/shelves",
    );
  });
});
