#!/usr/bin/env node

import { Util, State } from "@serverless-stack/core";
import { DebugApp, DebugStack } from "@serverless-stack/resources";
import url from "url";

const name = process.argv[2];
const stage = process.argv[3];
const region = process.argv[4];
const appPath = process.argv[5];
const appBuildLibPath = State.stacksPath(appPath);

// Load environment variables from dotenv
Util.Environment.load({
  root: appPath,
  searchPaths: [`.env.${stage}.local`, `.env.${stage}`],
});

// Validate the `debugStack` option in user SST app's index
const handler = await import(
  url.pathToFileURL(appBuildLibPath + "/index.js").href
);
if (handler.debugStack) {
  console.error(
    `Error: Use of the "debugStack()" callback to configure the debug stack has been deprecated in favor of the "debugApp()" callback.\n\nMore details on using "debugApp()": https://github.com/serverless-stack/sst/releases/tag/v0.65.3\n`
  );
  process.exit(1);
}

// Create CDK App
const app = new DebugApp({ name, stage, region });
if (handler.debugApp) {
  handler.debugApp(app);
} else {
  new DebugStack(app, "debug-stack");
}
