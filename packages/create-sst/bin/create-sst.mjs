#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import path from "path";
import url from "url";
import fs from "fs/promises";
import ora from "ora";
import { execute } from "create-sst";

program
  .name("create-sst")
  .description("CLI to create SST projects")
  .option("--template <template>", "Use a specific template")
  .argument("[name]", "The name of your project")
  .action(async (argumentName, opts) => {
    const cwd = process.cwd();
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    process.chdir(__dirname);

    const [preset, name, destination, parameters] = await (async function () {
      const files = await fs.readdir(cwd);
      const frameworks = [
        {
          name: "container",
          preset: "presets/dropin/container",
          tester: () => files.some((f) => f === "Dockerfile"),
          parameters: [
            {
              name: "port",
              type: "number",
              default: "3000",
              message: "What port is your app running on?",
            },
          ],
        },
        {
          name: "Next.js",
          preset: "presets/dropin/nextjs",
          tester: () => files.some((f) => f.startsWith("next.config")),
        },
        {
          name: "Astro",
          preset: "presets/dropin/astro",
          tester: () => files.some((f) => f.startsWith("astro.config")),
        },
        {
          name: "Svelte",
          preset: "presets/dropin/svelte",
          tester: () => files.some((f) => f.startsWith("svelte.config")),
        },
        {
          name: "Remix",
          preset: "presets/dropin/remix",
          tester: () => files.some((f) => f.startsWith("remix.config")),
        },
        {
          name: "Solid",
          preset: "presets/dropin/solid",
          tester: async () => {
            for (const f of files) {
              if (!f.startsWith("vite.config")) continue;
              const content = await fs.readFile(path.join(cwd, f));
              if (content.toString().match(/solid-start/)) {
                return true;
              }
            }
            return false;
          },
        },
      ];
      for (const framework of frameworks) {
        if (!(await framework.tester())) continue;

        const { confirm } = await inquirer.prompt([
          {
            name: "confirm",
            type: "confirm",
            default: true,
            message: `You are in a ${framework.name} project so SST will be setup in drop-in mode. Continue?`,
          },
        ]);
        if (!confirm) break;
        const parameters = await inquirer.prompt(framework.parameters || []);
        return [framework.preset, path.parse(cwd).name, cwd, parameters];
      }

      const answers = await inquirer.prompt([
        {
          name: "name",
          type: "input",
          default: "my-sst-app",
          when: !argumentName,
          message: "Project name",
        },
      ]);
      answers.name = answers.name || argumentName;
      const destination = path.join(cwd, answers.name);
      if (opts.template) {
        return [`presets/${opts.template}`, answers.name, destination, answers];
      }
      return ["presets/standard/api", answers.name, destination, answers];
    })();

    const spinner = ora();

    try {
      await fs.access(preset);
    } catch {
      spinner.fail(`Template not found for ` + preset.replace("presets/", ""));
      return;
    }
    spinner.start("Creating project");
    try {
      await execute({
        source: preset,
        destination,
        parameters: parameters ?? {},
      });
      spinner.succeed("Copied template files");
      console.log();
      console.log(`Next steps:`);
      if (destination !== cwd) {
        console.log(`- cd ${name}`);
      }
      console.log(`- pnpm install (or npm install, or yarn)`);
      console.log(`- npx sst dev`);
    } catch (e) {
      spinner.fail("Failed");
      console.error(e);
    }
  });

program.parse();
