import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Hero } from "./hero";

test("renders the headline, lead, actions and the book illustration", () => {
  render(
    <Hero
      eyebrow="Eyebrow"
      title="Mark your place, quietly."
      lead="Lead"
      note="Free."
      illustrationLabel="An open book"
    >
      <a href="/login">Sign in</a>
    </Hero>,
  );

  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Mark your place, quietly.",
    }),
  ).toBeInTheDocument();
  expect(screen.getByText("Lead")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(screen.getByRole("img", { name: "An open book" })).toBeInTheDocument();
});
