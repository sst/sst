const { runStartCommand } = require("../helpers");
const fs = require("fs");
const path = require("path");

test("sst-env-outputs-file-not-exist", async () => {
  const result = await runStartCommand(__dirname);

  expect(result).toContain(
    'sst-env: Cannot find the SST outputs file in undefined. Make sure "sst start" is running.'
  );
}, 6000);
