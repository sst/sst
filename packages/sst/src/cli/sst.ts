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

import { env } from "./commands/env.js";
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

dev(program);
deploy(program);
build(program);
bind(program);
env(program);
secrets(program);
remove(program);
update(program);
transform(program);
consoleCommand(program);
diff(program);
version(program);

// @ts-expect-error
process.setSourceMapsEnabled(true);
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
    `Need help with this error? Join the SST community on Discord ${blue(
      `https://sst.dev/discord`
    )}`
  );
  process.exit(1);
});

process.on("beforeExit", () => {});

program.parse();
