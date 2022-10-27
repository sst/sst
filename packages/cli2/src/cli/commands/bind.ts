import { Program } from "@cli/program.js";
import { Config } from "@core/config.js";
import { useAWSCredentials } from "@core/credentials";
import { spawnSync } from "child_process";

export const bind = (program: Program) =>
  program.command(
    "bind <command>",
    "",
    (yargs) =>
      yargs.positional("command", {
        type: "string",
        describe: "Command to bind to",
        demandOption: true,
      }),
    async (args) => {
      const env = await Config.env();
      const credentials = await useAWSCredentials();
      const result = spawnSync(args.command, {
        env: {
          ...env,
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
        },
        stdio: "inherit",
        shell: true,
      });
      process.exitCode = result.status || undefined;
    }
  );
