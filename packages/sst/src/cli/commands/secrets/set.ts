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
      const { Colors } = await import("../../colors.js");
      const { blue } = await import("colorette");
      const { createSpinner } = await import("../../spinner.js");

      // Set secret value
      const setting = createSpinner(` Setting "${args.name}"`).start();
      await Config.setSecret({
        key: args.name,
        value: args.value,
        fallback: args.fallback === true,
      });
      setting.succeed();

      // Restart functions & sites
      const restarting = createSpinner(
        ` Reloading all resources using ${blue(args.name)}...`
      ).start();
      const { edgeSites, sites, placeholderSites, functions } =
        await Config.restart([args.name]);
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
