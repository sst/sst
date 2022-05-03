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
  .option("--examples", "Only show example templates", false)
  .argument("[string]", "The template to clone")
  .argument("[string]", "The destination directory")
  .action(async (preset, destination) => {
    const opts = program.opts();
    const cwd = process.cwd();
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    process.chdir(__dirname);

    const scan = !opts.examples ? ["starters"] : ["examples"];
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
        when: !preset,
        choices: presets.flat(),
        message: "Select a template",
      },
      {
        name: "destination",
        type: "input",
        when: !destination,
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
    preset = selection.preset || preset;
    preset = path.join(
      "presets",
      preset.includes("/") ? "" : DEFAULT_CATEGORY,
      preset
    );
    const spinner = ora();

    try {
      await fs.access(preset);
    } catch {
      spinner.fail(`Template not found`);
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
      console.log(`  3: npm run sst:start`);
    } catch (e) {
      spinner.fail("Failed");
      console.error(e);
    }
  });

program.parse();
