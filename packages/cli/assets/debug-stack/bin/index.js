#!/usr/bin/env node

const cdk = require("@aws-cdk/core");
const { DebugStack } = require("../lib/DebugStack");

const stage = process.argv[3];
const region = process.argv[4];
const stackName = process.argv[2];

// Override default region
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region };

const app = new cdk.App();

new DebugStack(app, stackName, { env, stage, stackName, region });
