#!/usr/bin/env node

import { program } from "commander";
import color from "picocolors";
import * as prompt from "@clack/prompts";
import path from "path";
import url from "url";
import fs from "fs/promises";
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

    console.clear();
    prompt.intro(`${color.bgMagenta(color.black(" create-sst "))}`);

    const [preset, name, destination] = await (async function () {
      const files = await fs.readdir(cwd);

      if (files.some((f) => f.startsWith("next.config"))) {
        const confirm = await prompt.confirm({
          message:
            "You are in a Next.js project so SST will be setup in drop-in mode. Continue?",
          initialValue: true,
        });

        if (!confirm) return;
        return ["presets/dropin/nextjs", path.parse(cwd).name, cwd];
      }

      if (files.some((f) => f.startsWith("astro.config"))) {
        const confirm = await prompt.confirm({
          message:
            "You are in an Astro project so SST will be setup in drop-in mode. Continue?",
          initialValue: true,
        });
        if (!confirm) return;
        return ["presets/dropin/astro", path.parse(cwd).name, cwd];
      }
      const answers = await prompt.group(
        {
          name: () =>
            prompt.text({
              message: "Project name?",
              initialValue: argumentName || "my-sst-app",
              validate: (value) => {
                if (value.length === 0)
                  return `Name is required! Please enter a value for name`;
              },
            }),
        },
        {
          onCancel: () => {
            prompt.cancel("Operation cancelled.");
            process.exit(0);
          },
        }
      );

      const destination = path.join(cwd, answers.name);
      if (opts.template) {
        return [`presets/${opts.template}`, answers.name, destination];
      }
      return ["presets/standard/api", answers.name, destination];
    })();

    const spinner = prompt.spinner();
    try {
      await fs.access(preset);
    } catch {
      prompt.cancel(`Template not found for ` + preset.replace("presets/", ""));
      return;
    }
    spinner.start("Creating project");
    try {
      await execute({
        source: preset,
        destination: destination,
      });
      spinner.stop("Copied template files");
      const nextSteps = `1: cd ${name}
2: npm install (or pnpm install, or yarn)
3: npm run dev`;
      prompt.note(nextSteps, "Next steps.");
      prompt.outro(
        `Problems? ${color.underline(
          color.gray("https://github.com/serverless-stack/sst/issues")
        )}`
      );
    } catch (e) {
      spinner.stop();
      prompt.cancel(`failed ${e}`);
    }
  });

program.parse();
