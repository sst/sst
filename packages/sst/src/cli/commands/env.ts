import type { Program } from "../program.js";

export const env = (program: Program) =>
  program.command(
    "env <command>",
    "Load environment variables and start your frontend",
    (yargs) =>
      yargs
        .positional("command", {
          type: "string",
          describe: "The command to start your frontend",
          demandOption: true,
        })
        .example(
          `sst env "next dev"`,
          "Start Next.js with your environment variables"
        )
        .example(
          `sst env "vite dev"`,
          "Start Vite with your environment variables"
        ),
    async (args) => {
      const { createSpinner } = await import("../spinner.js");
      const fs = await import("fs/promises");
      const { SiteEnv } = await import("../../site-env.js");
      const { spawnSync } = await import("child_process");
      const { useAWSCredentials } = await import("../../credentials.js");
      const { useProject } = await import("../../project.js");
      let spinner: ReturnType<typeof createSpinner> | undefined;
      while (true) {
        const exists = await fs
          .access(SiteEnv.valuesFile())
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          spinner = createSpinner(
            "Cannot find SST environment variables. Waiting for SST to start..."
          ).start();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        spinner?.succeed();

        const sites = await SiteEnv.values();
        const env = sites[process.cwd()] || {};
        const project = useProject();
        const credentials = await useAWSCredentials();

        const result = spawnSync(args.command, {
          env: {
            ...process.env,
            ...env,
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_SESSION_TOKEN: credentials.sessionToken,
            AWS_REGION: project.config.region,
          },
          stdio: "inherit",
          shell: process.env.SHELL || true,
        });
        process.exitCode = result.status || undefined;

        break;
      }
    }
  );
