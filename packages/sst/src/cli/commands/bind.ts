import { VisibleError } from "../../error.js";
import type { Program } from "../program.js";

export const bind = (program: Program) =>
  program
    .command(
      "bind <command..>",
      "Bind your app's resources to a command",
      (yargs) =>
        yargs
          .array("command")
          .example(`sst bind "vitest run"`, "Bind your resources to your tests")
          .example(
            `sst bind "tsx scripts/myscript.ts"`,
            "Bind your resources to a script"
          ),
      async (args) => {
        const { Config } = await import("../../config.js");
        const { spawnSync } = await import("child_process");
        const { useAWSCredentials } = await import("../../credentials.js");
        const { useProject } = await import("../../project.js");

        const env = await Config.env();
        const project = useProject();
        const credentials = await useAWSCredentials();
        const joined = args.command?.join(" ");
        if (!joined)
          throw new VisibleError("Command is required, e.g. sst bind env");
        const result = spawnSync(joined, {
          env: {
            ...process.env,
            ...env,
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_SESSION_TOKEN: credentials.sessionToken,
            AWS_REGION: project.config.region,
          },
          stdio: "inherit",
          shell: true,
        });
        process.exitCode = result.status || undefined;
      }
    )
    .strict(false);
