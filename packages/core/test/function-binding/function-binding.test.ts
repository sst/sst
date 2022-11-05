import { test, expect } from "vitest";
import { normalizeId } from "../../src/function-binding";

test("normalizeId", async () => {
  expect(normalizeId("abc")).toBe("abc");
  expect(normalizeId("a_bc")).toBe("a_bc");
  expect(normalizeId("a-bc")).toBe("a_bc");
  expect(normalizeId("a-_bc")).toBe("a__bc");
});