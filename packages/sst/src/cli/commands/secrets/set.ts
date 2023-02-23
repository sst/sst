import type { Program } from "../../program.js";

export const set = (program: Program) =>
  program.command(
    "set <name> <value>",
    "Set the value of a secret",
    (yargs) =>
      yargs
        .positional("name", {
          type: "string",
          describe: "Name of the secret",
          demandOption: true,
        })
        .positional("value", {
          type: "string",
          describe: "Value of the secret",
          demandOption: true,
        })
        .option("fallback", {
          type: "boolean",
          describe: "Set the fallback value",
        }),
    async (args) => {
      const { Config } = await import("../../../config.js");
      const { blue } = await import("colorette");
      const { createSpinner } = await import("../../spinner.js");
      const setting = createSpinner(` Setting "${args.name}"`).start();
      await Config.setSecret({
        key: args.name,
        value: args.value,
        fallback: args.fallback === true,
      });
      setting.succeed();
      const restarting = createSpinner(
        ` Restarting all functions using ${blue(args.name)}...`
      ).start();
      const count = await Config.restart([args.name]);
      restarting.succeed(
        count === 1
          ? ` Restarted ${count} function`
          : ` Restarted ${count} functions`
      );
    }
  );
