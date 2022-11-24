#!/usr/bin/env node

import { blue, red } from "colorette";

import { program } from "./program.js";
import { secrets } from "./commands/secrets/secrets.js";
import { update } from "./commands/update.js";
import { start } from "./commands/start.js";
import { bind } from "./commands/bind.js";
import { build } from "./commands/build.js";
import { VisibleError } from "../error.js";
import { useSpinners } from "./spinner.js";
import { deploy } from "./commands/deploy.js";
import { remove } from "./commands/remove.js";
import dotenv from "dotenv";
import { env } from "./commands/env.js";
import { Logger } from "../logger.js";

dotenv.config();

secrets(program);
update(program);
start(program);
bind(program);
build(program);
deploy(program);
remove(program);
env(program);

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
    `Need help with this error? Join our discord ${blue(
      `https://discord.gg/sst`
    )} and talk to the team`
  );
  process.exit(1);
});

process.on("beforeExit", () => {});

program
  .fail((msg, error) => {
    if (!error) {
      console.log(msg);
      return;
    }
    throw error;
  })
  .parse();
