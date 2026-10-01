import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { AppShell } from "./app-shell";

const pathname = vi.hoisted(() => ({ current: "/app" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("@/features/auth/server/actions", () => ({ signOutAction: vi.fn() }));

const user = {
  email: "reader@example.test",
  name: "Reader A",
  avatarSrc: null,
};

describe("AppShell", () => {
  beforeEach(() => {
    pathname.current = "/app";
  });

  test("renders a labelled main nav with the Library link marked current", () => {
    renderWithIntl(<AppShell user={user}>content</AppShell>);

    const nav = screen.getByRole("navigation", { name: "Main" });
    const link = within(nav).getByRole("link", { name: "Library" });
    expect(link).toHaveAttribute("href", "/app");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  test("renders children inside the main landmark with a skip link to it", () => {
    renderWithIntl(<AppShell user={user}>page body</AppShell>);

    expect(screen.getByRole("main")).toHaveTextContent("page body");
    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("href", "#main");
  });

  test("offers a sign out button", () => {
    renderWithIntl(<AppShell user={user}>x</AppShell>);
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  test("does not mark Library current on other routes", () => {
    pathname.current = "/app/settings";
    renderWithIntl(<AppShell user={user}>x</AppShell>);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Library" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("links the reader's name and initials to their profile", () => {
    renderWithIntl(<AppShell user={user}>x</AppShell>);

    const link = screen.getByRole("link", { name: /Reader A/ });
    expect(link).toHaveAttribute("href", "/app/profile");
    expect(link).toHaveTextContent("RA");
    expect(link).toHaveTextContent("Reader A");
    expect(link).toHaveTextContent("reader@example.test");
  });
});
