import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { LoginForm } from "./login-form";

vi.mock("@/features/auth/server/actions", () => ({
  requestMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

describe("LoginForm", () => {
  test("offers a labelled email field, a magic link button and Google", () => {
    renderWithIntl(<LoginForm />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(
      screen.getByRole("button", { name: "Send me a magic link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("explains an expired link gently", () => {
    renderWithIntl(<LoginForm linkError="link" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/expired/);
  });

  test("carries the next path through both forms", () => {
    const { container } = renderWithIntl(<LoginForm next="/app/shelves" />);
    const hidden = container.querySelectorAll('input[name="next"]');
    expect(hidden).toHaveLength(2);
    hidden.forEach((input) => expect(input).toHaveValue("/app/shelves"));
  });
});
