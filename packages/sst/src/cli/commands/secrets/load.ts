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
      const fs = await import("fs/promises");

      const setting = createSpinner(
        ` Loading secrets from "${args.filename}"`
      ).start();

      const fileContent = await fs.readFile(args.filename, "utf-8");
      let envVars = await parseEnvFile(fileContent);

      for (const [key, value] of Object.entries(envVars)) {
        await Config.setSecret({
          key,
          value,
        });
      }

      setting.succeed();
      const restarting = createSpinner(
        ` Restarting all functions using ${blue(
          Object.keys(envVars).join(", ")
        )}...`
      ).start();
      const count = await Config.restart(Object.keys(envVars));
      restarting.succeed(
        count === 1
          ? ` Restarted ${count} function`
          : ` Restarted ${count} functions`
      );
    }
  );

const parseEnvFile = async (fileContent: string) => {
  const lines = fileContent.toString().split("\n");
  const envVars: Record<string, string> = {};
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    const [key, value] = line.split("=");
    envVars[key] = value;
  }

  return envVars;
};
