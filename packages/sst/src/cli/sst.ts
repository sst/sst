#!/usr/bin/env node

import { blue, red } from "colorette";

import { program } from "./program.js";
import { VisibleError } from "../error.js";
import { useSpinners } from "./spinner.js";
import { Logger } from "../logger.js";

import dotenv from "dotenv";
dotenv.config({
  override: true,
});
dotenv.config({
  path: ".env.local",
  override: true,
});

import { bootstrap } from "./commands/bootstrap.js";
import { dev } from "./commands/dev.js";
import { bind } from "./commands/bind.js";
import { build } from "./commands/build.js";
import { deploy } from "./commands/deploy.js";
import { remove } from "./commands/remove.js";
import { consoleCommand } from "./commands/console.js";
import { secrets } from "./commands/secrets/secrets.js";
import { update } from "./commands/update.js";
import { transform } from "./commands/transform.js";
import { diff } from "./commands/diff.js";
import { version } from "./commands/version.js";
import { telemetry } from "./commands/telemetry.js";
import { types } from "./commands/types.js";
import { connect } from "./commands/connect.js";

bootstrap(program);
dev(program);
deploy(program);
build(program);
bind(program);
secrets(program);
remove(program);
update(program);
transform(program);
consoleCommand(program);
diff(program);
version(program);
telemetry(program);
types(program);
connect(program);

if ("setSourceMapsEnabled" in process) {
  // @ts-expect-error
  process.setSourceMapsEnabled(true);
}
process.removeAllListeners("uncaughtException");
process.on("uncaughtException", (err) => {
  Logger.debug(err);
  const spinners = useSpinners();
  for (const spinner of spinners) {
    if (spinner.isSpinning) spinner.fail(spinner.text);
  }
  console.log(red("Error:"), err.message);
  if (!(err instanceof VisibleError)) {
    console.log();
    console.trace(err.stack);
  }
  console.log();
  console.log(
    `Need help with this error? Post it in #help on the SST Discord ${blue(
      `https://sst.dev/discord`
    )}`
  );
  process.exit(1);
});

process.on("beforeExit", () => {});

// Check Node version
const nodeVersion = process.versions.node;
if (Number(nodeVersion.split(".")[0]) < 16) {
  throw new VisibleError(
    `Node.js version ${nodeVersion} is not supported by SST. Please upgrade to Node.js 16 or later.`
  );
}

program.parse();
