#!/usr/bin/env node

const cdk = require("aws-cdk-lib");
const { Util } = require("@serverless-stack/core");
const { DebugStack } = require("../lib/DebugStack");

const stackName = process.argv[2];
const stage = process.argv[3];
const region = process.argv[4];
const appBuildLibPath = process.argv[6];

// Load environment variables from dotenv
Util.Environment.load({
  searchPaths: [`.env.${stage}.local`, `.env.${stage}`],
});

// If region is not defined in `sst.json` or through the cli command, it will be
// passed in as "undefined". We need a better way to pass and parse region. Maybe
// via `--region`.
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: region === "undefined" ? process.env.CDK_DEFAULT_REGION : region,
};
const app = new cdk.App();
const stack = new DebugStack(app, stackName, { env, stage });

// Allow user modify the debug stack
const handler = require(appBuildLibPath);
if (handler.debugStack) {
  handler.debugStack(app, stack, { stage });
}
