import { Program } from "../../program.js";
import { red } from "colorette";

export const get = (program: Program) =>
  program.command(
    "get <name>",
    "Get the value of a secret",
    (yargs) =>
      yargs
        .positional("name", {
          type: "string",
          describe: "Name of the secret",
          demandOption: true,
        })
        .option("fallback", {
          type: "boolean",
          describe: "Get the fallback value",
        }),
    async (args) => {
      const { Config } = await import("../../../config.js");
      const { bold } = await import("colorette");
      try {
        const result = await Config.getSecret({
          key: args.name,
          fallback: args.fallback === true,
        });
        console.log(bold(result!));
      } catch {
        console.log(red(`${bold(args.name)} is not set`));
      }
    }
  );
