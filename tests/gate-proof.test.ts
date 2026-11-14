import { expect, test } from "vitest";

test("fails on purpose, to see the pull request check stop it", () => {
  expect(1).toBe(2);
});
