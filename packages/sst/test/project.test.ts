import { test, expect } from "vitest";
import { exportedForTesting } from "../dist/project.js";
const { sanitizeStageName, isValidStageName } = exportedForTesting;

test("sanitize stage name", async () => {
  expect(sanitizeStageName("foo")).equal("foo");
  expect(sanitizeStageName("foo-bar")).equal("foo-bar");
  expect(sanitizeStageName("foo.bar")).equal("foo-bar");
  expect(sanitizeStageName("foo..bar")).equal("foo-bar");
  expect(sanitizeStageName(".foo")).equal("foo");
  expect(sanitizeStageName("0foo")).equal("foo");
  expect(sanitizeStageName("0foo")).equal("foo");
  expect(sanitizeStageName("foo0")).equal("foo0");
  expect(sanitizeStageName("foo.")).equal("foo");
});

test("is valid stage name", async () => {
  expect(isValidStageName("foo")).equal(true);
  expect(isValidStageName("foo-bar")).equal(true);
  expect(isValidStageName("foo--bar")).equal(true);
  expect(isValidStageName("foo--bar")).equal(true);
  expect(isValidStageName("foo.bar")).equal(false);
  expect(isValidStageName("0foo")).equal(false);
  expect(isValidStageName("foo0")).equal(true);
  expect(isValidStageName("foo-")).equal(true);
});
