import { Program } from "../../program.js";

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
      const { red } = await import("colorette");
      const { Config } = await import("../../../config.js");
      const { Colors } = await import("../../colors.js");
      try {
        const result = await Config.getSecret({
          key: args.name,
          fallback: args.fallback === true,
        });
        console.log(result!);
      } catch {
        Colors.line(Colors.danger(`✖ `), `"${args.name}" is not set`);
      }
    }
  );
