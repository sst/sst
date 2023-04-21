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
      const { Colors } = await import("../../colors.js");
      const { blue } = await import("colorette");
      const { createSpinner } = await import("../../spinner.js");
      const { parse } = await import("dotenv");
      const fs = await import("fs/promises");

      // Parse .env file
      const fileContent = await fs.readFile(args.filename, "utf-8");
      const envVars = parse(fileContent);

      // Set secrets
      const setting = createSpinner(
        ` Setting secrets from "${args.filename}"`
      ).start();
      for (const [key, value] of Object.entries(envVars)) {
        await Config.setSecret({ key, value });
      }
      setting.succeed();

      // Restart functions & sites
      const envNames = Object.keys(envVars);
      const restarting = createSpinner(
        ` Restarting all resources using ${blue(envNames.join(", "))}...`
      ).start();
      const { edgeSites, sites, placeholderSites, functions } =
        await Config.restart(envNames);
      restarting.stop().clear();

      const siteCount = sites.length + placeholderSites.length;
      if (siteCount > 0) {
        Colors.line(
          Colors.success(`✔ `),
          siteCount === 1
            ? `Reloaded ${siteCount} site`
            : `Reloaded ${siteCount} sites`
        );
      }
      const functionCount = functions.length;
      if (functionCount > 0) {
        Colors.line(
          Colors.success(`✔ `),
          functionCount === 1
            ? `Reloaded ${functionCount} function`
            : `Reloaded ${functionCount} functions`
        );
      }
      edgeSites.forEach(({ id, type }) => {
        Colors.line(
          Colors.primary(`➜ `),
          `Redeploy the "${id}" ${type} to use the new secret`
        );
      });

      process.exit(0);
    }
  );
