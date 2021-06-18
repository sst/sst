#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
const cdk = require("@aws-cdk/core");
const { DebugStack } = require("../lib/DebugStack");

const stackName = process.argv[2];
const stage = process.argv[3];
const region = process.argv[4];
const appPath = process.argv[5];
const appBuildLibPath = process.argv[6];

// Load environment variables from dotenv
loadDotenv(stage);

// Override default region
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region };

const app = new cdk.App();
const stack = new DebugStack(app, stackName, { env, stage, stackName, region });

// Allow user modify the debug stack
const handler = require(appBuildLibPath);
if (handler.debugStack) {
  handler.debugStack(app, stack, { stage });
}

function loadDotenv(stage) {
  [`.env.${stage}.local`, `.env.${stage}`, `.env.local`, `.env`]
    .map((file) => path.join(appPath, file))
    .filter((path) => fs.existsSync(path))
    .map((path) => {
      const result = dotenv.config({ path, debug: process.env.DEBUG });
      if (result.error) {
        console.error(`Failed to load environment variables from "${path}".`);
        console.error(result.error.message);
        process.exit(1);
      }
      return dotenvExpand(result);
    });
}
