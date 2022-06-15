#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import path from "path";
import url from "url";
import fs from "fs/promises";
import ora from "ora";
import { execute } from "create-sst";

const DEFAULT_CATEGORY = "starters";

program
  .name("create-sst")
  .description("CLI to create SST projects")
  .option("--examples", "Show example templates", false)
  .option("--minimal", "Show minimal templates", false)
  .argument("[directory]", "The destination directory")
  .action(async (destination) => {
    const opts = program.opts();
    const cwd = process.cwd();
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    process.chdir(__dirname);

    let preset = path.join("presets", "default");

    if (opts.examples || opts.minimal) {
      const scan = opts.minimal ? ["starters"] : ["examples"];
      const presets = (
        await Promise.all(
          scan.map(async (category) => {
            const folders = await fs.readdir(
              path.join(__dirname, "presets", category)
            );
            return folders.map((folder) =>
              path.join(category === DEFAULT_CATEGORY ? "" : category, folder)
            );
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

    const answers = await inquirer.prompt([
      {
        name: "destination",
        type: "input",
        when: !destination,
        default: "my-sst-app",
        message: "Destination directory",
      },
    ]);
    const selection = Object.assign(
      {
        preset,
        destination,
      },
      answers
    );
    destination = path.resolve(
      path.join(cwd, selection.destination || destination)
    );
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
        destination,
      });
      spinner.succeed("Copied template files");
      console.log();
      console.log(`Next steps:`);
      console.log(`  1: cd ${selection.destination}`);
      console.log(`  2: npm install (or pnpm install, or yarn)`);
      console.log(`  3: npm start`);
    } catch (e) {
      spinner.fail("Failed");
      console.error(e);
    }
  });

program.parse();
