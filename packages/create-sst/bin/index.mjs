#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import path from "path";
import url from "url";
import fs from "fs/promises";
import { applyPreset } from "@preset/core";
import ora from "ora";

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
      preset,
      "preset.ts"
    );
    const spinner = ora();

    try {
      await fs.access(preset);
    } catch {
      spinner.fail(`Template not found`);
      return;
    }
    spinner.start("Creating project");
    const result = await applyPreset({
      resolvable: preset,
      targetDirectory: destination,
      rawArguments: [preset, destination],
      parsedOptions: {},
    });
    if (result) {
      spinner.succeed("Complete!");
      return;
    }
    spinner.fail("Failed");
  });

program.parse();
