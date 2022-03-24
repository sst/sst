const { runStartCommand } = require("../helpers");

test("sst-env-outputs-not-found", async () => {
  const result = await runStartCommand(__dirname);

  expect(result).toContain("Cannot find matching SST environment outputs");
});
