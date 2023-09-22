import type { Program } from "../../program.js";
import { exitWithError } from "../../program.js";

export const remove = (program: Program) =>
  program.command(
    "remove <name>",
    "Remove a secret",
    (yargs) =>
      yargs
        .positional("name", {
          describe: "Name of the secret",
          type: "string",
          demandOption: true,
        })
        .option("fallback", {
          type: "boolean",
          describe: "Remove the fallback value",
        }),
    async (args) => {
      const { Config } = await import("../../../config.js");
      const { exit, exitWithError } = await import("../../program.js");
      const { SilentError } = await import("../../../error.js");
      const { Colors } = await import("../../colors.js");

      try {
        await Config.removeSecret({
          key: args.name,
          fallback: args.fallback === true,
        });
        Colors.line(Colors.success(`✔ `), `Removed "${args.name}"`);
        await exit();
      } catch {
        Colors.line(Colors.danger(`✖ `), `"${args.name}" is not set`);
        await exitWithError(new SilentError(`"${args.name}" is not set`));
      }
    }
  );
