import type { Program } from "../../program.js";

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
      const { Colors } = await import("../../colors.js");
      try {
        await Config.removeSecret({
          key: args.name,
          fallback: args.fallback === true,
        });
        Colors.line(Colors.success(`✔ `), `Removed "${args.name}"`);
      } catch {
        Colors.line(Colors.danger(`✖ `), `"${args.name}" is not set`);
      }
    }
  );
