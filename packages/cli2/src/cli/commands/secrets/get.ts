import { Program } from "@cli/program.js";
import { red } from "colorette";

export const get = (program: Program) =>
  program
    .command(
      "get <name>",
      "Get secret value",
      (yargs) =>
        yargs.positional("name", {
          type: "string",
          describe: "Name of secret",
          demandOption: true,
        }),
      async (args) => {
        const { Config } = await import("@core/config.js");
        const { bold } = await import("colorette");
        try {
          const result = await Config.getSecret({
            key: args.name,
          });
          console.log(bold(result!));
        } catch {
          console.log(red(`${bold(args.name)} is not set`));
        }
      }
    )
    .command(
      "get-fallback <name>",
      "Get secret value",
      (yargs) =>
        yargs.positional("name", {
          type: "string",
          describe: "Name of secret",
          demandOption: true,
        }),
      async (args) => {
        const { Config } = await import("@core/config.js");
        const { bold } = await import("colorette");
        try {
          const result = await Config.getSecret({
            key: args.name,
            fallback: true,
          });
          console.log(bold(result!));
        } catch {
          console.log(red(`${bold(args.name)} is not set`));
        }
      }
    );
