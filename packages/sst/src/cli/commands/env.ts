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
      const { useProject } = await import("../../project.js");
      
      let spinner: ReturnType<typeof createSpinner> | undefined;
      while (true) {
        const exists = await fs
          .access(SiteEnv.valuesFile())
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          spinner = createSpinner("Cannot find SST environment variables. Waiting for SST to start...").start();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        spinner?.succeed();

        const sites = await SiteEnv.values();
        const project = useProject();
        const env = sites[process.cwd()] || {};

        const result = spawnSync(args.command, {
          env: {
            AWS_PROFILE: project.config.profile,
            AWS_REGION: project.config.region,
            ...process.env,
            ...env,
          },
          stdio: "inherit",
          shell: process.env.SHELL || true,
        });
        process.exitCode = result.status || undefined;

        break;
      }
    }
  );
