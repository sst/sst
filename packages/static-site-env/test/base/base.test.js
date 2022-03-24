const { runStartCommand } = require("../helpers");

test("base", async () => {
  const result = await runStartCommand(__dirname);

  expect(result).not.toContain("Waiting for SST to start");
  expect(result).toContain("my-url");
});
