import { test, expect } from "vitest";
import { normalizeGitUrl } from "../../src/telemetry/project-id";

test("normalizeGitUrl git", async () => {
  expect(normalizeGitUrl("git@github.com:user/repo")).toBe(
    "github.com/user/repo"
  );
  expect(normalizeGitUrl("git@github.com:user/repo.git")).toBe(
    "github.com/user/repo"
  );
});

test("normalizeGitUrl http", async () => {
  expect(normalizeGitUrl("http://github.com/user/repo")).toBe(
    "github.com/user/repo"
  );
  expect(normalizeGitUrl("http://github.com/user/repo.git")).toBe(
    "github.com/user/repo"
  );
  expect(
    normalizeGitUrl("http://username:password@github.com/user/repo.git")
  ).toBe("github.com/user/repo");
});

test("normalizeGitUrl https", async () => {
  expect(normalizeGitUrl("https://github.com/user/repo")).toBe(
    "github.com/user/repo"
  );
  expect(normalizeGitUrl("https://github.com/user/repo.git")).toBe(
    "github.com/user/repo"
  );
  expect(
    normalizeGitUrl("https://username:password@github.com/user/repo.git")
  ).toBe("github.com/user/repo");
});
