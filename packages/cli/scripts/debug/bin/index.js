#!/usr/bin/env node

const cdk = require("@aws-cdk/core");
const { DebugStack } = require("../lib/debug-stack");

const stage = process.env.SST_DEBUG_STAGE;
const region = process.env.SST_DEBUG_REGION;
const stackName = process.env.SST_DEBUG_STACK;

const app = new cdk.App();

new DebugStack(app, stackName, { stage, stackName, region });
