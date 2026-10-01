import { expect, test } from "vitest";

import { centreSquare, containSize } from "./images";

test("centreSquare crops the middle of a photo", () => {
  expect(centreSquare(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 });
  expect(centreSquare(300, 500)).toEqual({ sx: 0, sy: 100, side: 300 });
});

test("containSize shrinks the longer side and never enlarges", () => {
  expect(containSize(1200, 1800, 600)).toEqual({ width: 400, height: 600 });
  expect(containSize(2000, 1000, 600)).toEqual({ width: 600, height: 300 });
  expect(containSize(300, 450, 600)).toEqual({ width: 300, height: 450 });
});
