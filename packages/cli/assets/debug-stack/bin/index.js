#!/usr/bin/env node

const cdk = require("@aws-cdk/core");
const { DebugStack } = require("../lib/DebugStack");

const stackName = process.argv[2];
const stage = process.argv[3];
const region = process.argv[4];
const appBuildLibPath = process.argv[6];
const { Util } = require("@serverless-stack/core");

// Load environment variables from dotenv
Util.Environment.load({
  searchPaths: [`.env.${stage}.local`, `.env.${stage}`],
});

// Override default region
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region };

const app = new cdk.App();
const stack = new DebugStack(app, stackName, { env, stage, stackName, region });

// Allow user modify the debug stack
const handler = require(appBuildLibPath);
if (handler.debugStack) {
  handler.debugStack(app, stack, { stage });
}
