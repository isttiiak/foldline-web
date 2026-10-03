import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import messages from "../../../../messages/en.json";

import { countByState, type LibraryParams } from "../query";
import { LibraryToolbar } from "./library-toolbar";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const base: LibraryParams = { q: "", sort: "added", pages: 1 };
const counts = countByState([]);

function ui(params: LibraryParams) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <LibraryToolbar params={params} counts={counts} />
    </NextIntlClientProvider>
  );
}

describe("LibraryToolbar search box", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  const box = () => screen.getByLabelText("Search your library");

  test("updates the address after a pause", () => {
    render(ui(base));
    fireEvent.change(box(), { target: { value: "abc" } });
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(replace).toHaveBeenCalledWith("/app?q=abc", { scroll: false });
  });

  test("an older echo from the address never eats what was typed since", () => {
    const { rerender } = render(ui(base));
    fireEvent.change(box(), { target: { value: "abc" } });
    act(() => vi.advanceTimersByTime(300));
    // More letters arrive before the address catches up.
    fireEvent.change(box(), { target: { value: "abcd" } });
    rerender(ui({ ...base, q: "abc" }));
    expect(box()).toHaveValue("abcd");
  });

  test("following a link or going back replaces the box", () => {
    const { rerender } = render(ui({ ...base, q: "abc" }));
    expect(box()).toHaveValue("abc");
    rerender(ui({ ...base, q: "other" }));
    expect(box()).toHaveValue("other");
    rerender(ui(base));
    expect(box()).toHaveValue("");
  });

  test("Escape clears the box", () => {
    render(ui({ ...base, q: "abc" }));
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(box()).toHaveValue("");
  });
});
