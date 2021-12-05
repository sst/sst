import fs from "fs";
import path from "path";
if (fs.existsSync(path.join(__dirname, "node_modules")))
  fs.rmdirSync(path.join(__dirname, "node_modules"), { recursive: true });

import { clearBuildOutput } from "../helpers";
import { Update } from "@serverless-stack/core";

const pkgContents = {
  name: "fake",
  private: true,
  description: "tests",
  version: "0.40.0",
  scripts: {
    "add-cdk": "sst add-cdk",
  },
  dependencies: {
    "@aws-cdk/aws-lambda": "latest",
    "@serverless-stack/cli": "latest",
    "@serverless-stack/resources": "latest",
    "aws-cdk": "latest",
  },
  license: "ISC",
};
const root = fs.mkdtempSync("fake-");
const pkgPath = path.join(root, "package.json");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  fs.rmdirSync(root, { recursive: true });
  await clearBuildOutput(__dirname);
});

/**
 * Test that the add-cdk command ran successfully
 */

test("npm", async () => {
  fs.writeFileSync(pkgPath, JSON.stringify(pkgContents));
  Update.run({ rootDir: root, verbose: false });

  expect(fs.readFileSync(pkgPath).toString()).not.toContain("latest");
});
