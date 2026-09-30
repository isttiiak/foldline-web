import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { DeleteAccountForm } from "./delete-account-form";

vi.mock("@/features/account/server/actions", () => ({
  deleteAccountAction: vi.fn(),
}));

describe("DeleteAccountForm", () => {
  test("asks to open the form before offering to delete", async () => {
    renderWithIntl(<DeleteAccountForm email="reader@example.com" />);

    expect(
      screen.queryByRole("button", { name: "Delete everything, forever" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    expect(
      await screen.findByLabelText("Type your email to confirm"),
    ).toBeInTheDocument();
  });

  test("keeps the delete button disabled until the email matches", async () => {
    renderWithIntl(<DeleteAccountForm email="reader@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));

    const input = await screen.findByLabelText("Type your email to confirm");
    const submit = screen.getByRole("button", {
      name: "Delete everything, forever",
    });
    expect(submit).toBeDisabled();

    fireEvent.change(input, { target: { value: "reader@example.co" } });
    expect(submit).toBeDisabled();

    fireEvent.change(input, { target: { value: "Reader@Example.com" } });
    expect(submit).toBeEnabled();
  });

  test("cancel closes the form again", async () => {
    renderWithIntl(<DeleteAccountForm email="reader@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete my account" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Keep my account" }),
    );

    expect(
      await screen.findByRole("button", { name: "Delete my account" }),
    ).toBeInTheDocument();
  });
});
