import { Program } from "../../program.js";
import { Config } from "../../../config.js";

export const remove = (program: Program) =>
  program
    .command(
      "remove <name>",
      "Remove secret",
      (yargs) =>
        yargs.positional("name", {
          describe: "Name of secret to remove",
          type: "string",
          demandOption: true,
        }),
      async (args) => {
        await Config.removeSecret({
          key: args.name,
        });
      }
    )
    .command(
      "remove-fallback <name>",
      "Remove secret",
      (yargs) =>
        yargs.positional("name", {
          describe: "Name of secret to remove",
          type: "string",
          demandOption: true,
        }),
      async (args) => {
        await Config.removeSecret({
          key: args.name,
          fallback: true,
        });
      }
    );
