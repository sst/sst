process.removeAllListeners("uncaughtException");
process.on("uncaughtException", (err) => {
  console.log(red(err.message));
  console.log(
    blue(
      "Need help with this error? Join our discord https://discord.gg/sst and talk to the team"
    )
  );
  if (!(err instanceof VisibleError)) {
    console.log(yellow(err.stack || ""));
  }
  process.exit(1);
});

process.on("beforeExit", () => {});

import { blue, red, yellow } from "colorette";
import { VisibleError } from "@core/error.js";

import { program } from "./program.js";
import { secrets } from "./commands/secrets/secrets.js";
import { update } from "./commands/update.js";
import { start } from "./commands/start.js";
import { bind } from "./commands/bind.js";
import { build } from "./commands/build.js";

secrets(program);
update(program);
start(program);
bind(program);
build(program);

program
  .fail((msg, error) => {
    if (!error) {
      console.log(msg);
      return;
    }
    throw error;
  })
  .parse();
