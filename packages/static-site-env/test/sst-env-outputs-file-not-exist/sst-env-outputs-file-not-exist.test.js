const { runStartCommand } = require("../helpers");

test("sst-env-outputs-file-not-exist", async () => {
  const result = await runStartCommand(__dirname);

  expect(result).toContain("sst-env: Cannot find the SST outputs file");
});
