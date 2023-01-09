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
  .action(async () => {
    const opts = program.opts();
    const cwd = process.cwd();
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    process.chdir(__dirname);

    const [preset, name, destination] = await (async function () {
      const files = await fs.readdir(cwd);
      if (files.some((f) => f.startsWith("next.config"))) {
        const { confirm } = await inquirer.prompt([
          {
            name: "confirm",
            type: "confirm",
            default: true,
            message:
              "You are in a Next.js project so SST will be setup in drop-in mode. Continue?",
          },
        ]);
        if (!confirm) return;
        return ["presets/dropin/nextjs", path.parse(cwd).name, cwd];
      }

      const answers = await inquirer.prompt([
        {
          name: "name",
          type: "input",
          default: "my-sst-app",
          message: "Project name",
        },
      ]);
      return [
        "presets/standard/base",
        answers.name,
        path.join(cwd, answers.name),
      ];

      if (opts.template) return path.join("presets", opts.template);

      const { category } = await inquirer.prompt([
        {
          name: "category",
          type: "list",
          choices: ["graphql", "minimal", "examples"],
          message: "What kind of project do you want to create?",
        },
      ]);

      if (["minimal", "examples"].includes(category)) {
        const folders = await fs.readdir(
          path.join(__dirname, "presets", category)
        );
        const presets = folders.map((folder) => path.join(category, folder));
        const answers = await inquirer.prompt([
          {
            name: "preset",
            type: "list",
            choices: presets.flat(),
            message: "Select a template",
          },
        ]);
        return [path.join("presets", answers.preset)];
      }

      if (category === "graphql") {
        const result = await inquirer.prompt([
          {
            name: "database",
            type: "list",
            choices: [
              { name: "RDS (Postgres or MySQL)", value: "rds" },
              { name: "DynamoDB", value: "dynamo" },
            ],
            message:
              "Select a database (you can change this later or use both)",
          },
        ]);
        return path.join("presets", "graphql", result.database);
      }
    })();

    const spinner = ora();

    try {
      await fs.access(preset);
    } catch {
      spinner.fail(`Template not found at ` + preset);
      return;
    }
    spinner.start("Creating project");
    try {
      await execute({
        source: preset,
        destination: destination,
      });
      spinner.succeed("Copied template files");
      console.log();
      console.log(`Next steps:`);
      console.log(`  1: cd ${name}`);
      console.log(`  2: npm install (or pnpm install, or yarn)`);
      console.log(`  3: npm run dev`);
    } catch (e) {
      spinner.fail("Failed");
      console.error(e);
    }
  });

program.parse();
