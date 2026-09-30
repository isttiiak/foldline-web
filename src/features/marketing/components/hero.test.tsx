import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Hero } from "./hero";

test("renders the headline, a CTA into the app and the three promises", () => {
  render(
    <Hero
      markLabel="Logo"
      eyebrow="Eyebrow"
      title="Mark your place, quietly."
      lead="Lead"
      cta="Open my library"
      promises={[
        { key: "formats", title: "Formats", body: "a" },
        { key: "private", title: "Private", body: "b" },
        { key: "rest", title: "Rest", body: "c" },
      ]}
    />,
  );

  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Mark your place, quietly.",
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open my library" })).toHaveAttribute(
    "href",
    "/app",
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("img", { name: "Logo" })).toBeInTheDocument();
});
