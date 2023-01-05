import { useProject } from "../../app.js";
import { Program } from "../program.js";
import { createSpinner } from "../spinner.js";
import fs from "fs/promises";
import path from "path";
import { SiteEnv } from "../../site-env.js";
import { spawnSync } from "child_process";

export const env = (program: Program) =>
  program.command(
    "env <command>",
    "description",
    (yargs) =>
      yargs.positional("command", {
        type: "string",
        describe: "Command to run with environment variabels loaded",
        demandOption: true,
      }),
    async (args) => {
      const project = useProject();

      const spinner = createSpinner("Waiting for SST to start").start();
      while (true) {
        const exists = await fs
          .access(SiteEnv.valuesFile())
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        spinner.succeed();

        const sites = await SiteEnv.values();
        const current = path.relative(project.paths.root, process.cwd());
        const env = sites[current] || {};

        console.log(args.command);
        const result = spawnSync(args.command, {
          env: {
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
