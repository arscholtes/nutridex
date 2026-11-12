import { expect, test } from "vitest";
import config from "../next.config.ts";

test("the creature drawings ship with every page's server function, which reads them from disk", () => {
  expect(config.outputFileTracingIncludes).toEqual({ "/**": ["./public/art/ingredients/**"] });
});
