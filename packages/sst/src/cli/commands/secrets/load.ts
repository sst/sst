import type { Program } from "../../program.js";

export const load = (program: Program) =>
  program.command(
    "load <filename>",
    "Loads secrets from an .env file",
    (yargs) =>
      yargs.positional("filename", {
        type: "string",
        demandOption: true,
      }),
    async (args) => {
      const { Config } = await import("../../../config.js");
      const { blue } = await import("colorette");
      const { createSpinner } = await import("../../spinner.js");
      const { parse } = await import("dotenv");
      const fs = await import("fs/promises");

      // Parse .env file
      const fileContent = await fs.readFile(args.filename, "utf-8");
      const envVars = parse(fileContent);

      // Set secrets
      const setting = createSpinner(
        ` Loading secrets from "${args.filename}"`
      ).start();
      for (const [key, value] of Object.entries(envVars)) {
        await Config.setSecret({ key, value });
      }
      setting.succeed();

      // Restart secrets
      const envNames = Object.keys(envVars);
      const restarting = createSpinner(
        ` Restarting all functions using ${blue(envNames.join(", "))}...`
      ).start();
      const count = await Config.restart(envNames);
      restarting.succeed(
        count === 1
          ? ` Restarted ${count} function`
          : ` Restarted ${count} functions`
      );
    }
  );
