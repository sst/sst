const { runJestCommand } = require("../helpers");

/**
 * Test that the jest tests run successfully
 */
test("jest", async () => {
  const result = await runJestCommand(__dirname);

  expect(result).not.toContain("JESTTESTFAILED-----");
});
