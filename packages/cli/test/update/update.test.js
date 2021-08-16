const fs = require("fs");
const path = require("path");
if (fs.existsSync(path.join(__dirname, "node_modules")))
  fs.rmdirSync(path.join(__dirname, "node_modules"), { recursive: true });

const { clearBuildOutput } = require("../helpers");
const { Update } = require("@serverless-stack/core");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  fs.writeFileSync(pkgPath, pkg);
  await clearBuildOutput(__dirname);
});

/**
 * Test that the add-cdk command ran successfully
 */
const pkgPath = path.join(__dirname, "package.json");
const pkg = fs.readFileSync(pkgPath).toString();

test("update", async () => {
  const parsed = JSON.parse(pkg);
  parsed.dependencies["@serverless-stack/resources"] = "latest";
  parsed.dependencies["@serverless-stack/cli"] = "latest";
  parsed.dependencies["@aws-cdk/aws-lambda"] = "latest";
  parsed.dependencies["aws-cdk"] = "latest";
  fs.writeFileSync(pkgPath, JSON.stringify(parsed));
  Update.run(__dirname);

  expect(fs.readFileSync(pkgPath).toString()).not.toContain("latest");
});
