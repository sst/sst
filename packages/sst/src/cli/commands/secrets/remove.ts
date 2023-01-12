import { Program } from "../../program.js";
import { Config } from "../../../config.js";

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
      await Config.removeSecret({
        key: args.name,
        fallback: args.fallback === true,
      });
    }
  );
