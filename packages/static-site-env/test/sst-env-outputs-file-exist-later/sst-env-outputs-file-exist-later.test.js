const path = require("path");
const fs = require("fs-extra");
const { sleep, runStartCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

test("sst-env-outputs-file-exist-later", async () => {
  // Add outputs file after 2 seconds
  sleep(2).then(() => {
    fs.ensureDirSync(path.join(__dirname, ".build"));
    fs.copySync(
      path.join(
        __dirname,
        "static-site-environment-output-values.placeholder.json"
      ),
      path.join(__dirname, ".build/static-site-environment-output-values.json")
    );
  });

  const result = await runStartCommand(__dirname);

  expect(result).toContain("Waiting for SST to start");
  expect(result).toContain("my-url");
});
