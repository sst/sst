#!/usr/bin/env node
const cdk = require("@aws-cdk/core");
const { DebugStack } = require("../lib/debug-stack");

const app = new cdk.App();
const stage = "local";
const name = "debug-stack";
const region = "us-east-1";
new DebugStack(app, `${stage}-${name}`, { stage, name, region });
