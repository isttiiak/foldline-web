import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { RatingStars, StarsDisplay } from "./rating-stars";

describe("RatingStars", () => {
  test("ten half-star choices, read as stars", () => {
    renderWithIntl(<RatingStars value={7} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(10);
    expect(screen.getByRole("radio", { name: "3.5 stars" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "0.5 stars" })).not.toBeChecked();
  });

  test("picking a half star sends 1-10, and clearing sends null", () => {
    const onChange = vi.fn();
    renderWithIntl(<RatingStars value={4} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "4.5 stars" }));
    expect(onChange).toHaveBeenLastCalledWith(9);
    fireEvent.click(screen.getByRole("button", { name: "Clear rating" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  test("no clear button without a rating", () => {
    renderWithIntl(<RatingStars value={null} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Clear rating" })).toBeNull();
  });

  test("the read-only display names its stars", () => {
    renderWithIntl(<StarsDisplay rating={9} />);
    expect(screen.getByRole("img", { name: "4.5 stars" })).toBeInTheDocument();
  });
});
