import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { AppShell } from "./app-shell";

const pathname = vi.hoisted(() => ({ current: "/app" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("@/features/auth/server/actions", () => ({ signOutAction: vi.fn() }));

describe("AppShell", () => {
  beforeEach(() => {
    pathname.current = "/app";
  });

  test("renders a labelled main nav with the Library link marked current", () => {
    renderWithIntl(<AppShell>content</AppShell>);

    const nav = screen.getByRole("navigation", { name: "Main" });
    const link = within(nav).getByRole("link", { name: "Library" });
    expect(link).toHaveAttribute("href", "/app");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  test("renders children inside the main landmark with a skip link to it", () => {
    renderWithIntl(<AppShell>page body</AppShell>);

    expect(screen.getByRole("main")).toHaveTextContent("page body");
    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("href", "#main");
  });

  test("offers a sign out button", () => {
    renderWithIntl(<AppShell>x</AppShell>);
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  test("does not mark Library current on other routes", () => {
    pathname.current = "/app/settings";
    renderWithIntl(<AppShell>x</AppShell>);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("link", { name: "Library" }),
    ).not.toHaveAttribute("aria-current");
  });
});
