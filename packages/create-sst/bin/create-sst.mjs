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
  .option("--examples", "Show example templates", false)
  .option("--minimal", "Show minimal templates", false)
  .argument("[name]", "The name of your project")
  .action(async (name) => {
    const opts = program.opts();
    const cwd = process.cwd();
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    process.chdir(__dirname);

    let preset = path.join("presets", opts.template || "default");

    if (!opts.template && (opts.examples || opts.minimal)) {
      const scan = opts.examples ? ["examples"] : ["starters"];
      const presets = (
        await Promise.all(
          scan.map(async (category) => {
            const folders = await fs.readdir(
              path.join(__dirname, "presets", category)
            );
            return folders.map((folder) => path.join(category, folder));
          })
        )
      ).flat();
      const answers = await inquirer.prompt([
        {
          name: "preset",
          type: "list",
          choices: presets.flat(),
          message: "Select a template",
        },
      ]);
      preset = path.join("presets", answers.preset);
    }

    if (preset.endsWith("default")) {
      const result = await inquirer.prompt([
        {
          name: "database",
          type: "list",
          choices: [
            { name: "RDS (Postgres or MySQL)", value: "rds" },
            { name: "DynamoDB", value: "dynamo" },
          ],
          message: "Select a database (you can change this later or use both)",
        },
      ]);
      preset = path.join(preset, result.database);
    }

    if (!name) {
      const answers = await inquirer.prompt([
        {
          name: "name",
          type: "input",
          default: "my-sst-app",
          message: "Project name",
        },
      ]);
      name = answers.name;
    }
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
        destination: path.resolve(path.join(cwd, name)),
      });
      spinner.succeed("Copied template files");
      console.log();
      console.log(`Next steps:`);
      console.log(`  1: cd ${name}`);
      console.log(`  2: npm install (or pnpm install, or yarn)`);
      console.log(`  3: npm start`);
    } catch (e) {
      spinner.fail("Failed");
      console.error(e);
    }
  });

program.parse();
