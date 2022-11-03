import { bold, magenta, green, blue } from "colorette";
import { render } from "ink";
import React from "react";
import { useBus } from "@core/bus.js";
import { Logger } from "@core/logger.js";
import { useIOTBridge } from "@core/runtime/iot.js";
import { useNodeHandler } from "@core/runtime/node.js";
import { useRuntimeServer } from "@core/runtime/server.js";
import { useRuntimeWorkers } from "@core/runtime/workers.js";
import { Stacks } from "@core/stacks/index.js";
import { useFunctions, useMetadata } from "@core/stacks/metadata.js";
import { useWatcher } from "@core/watcher.js";
import { Context } from "@serverless-stack/node/context/index.js";

import { DeploymentUI } from "./deploy.js";
import { Metafile } from "esbuild";
import { Program } from "@cli/program.js";
import ora from "ora";

export const start = (program: Program) =>
  program.command(
    "start",
    "Work on your SST app locally",
    yargs => yargs,
    async () => {
      ora("Listening for function invocations")
        .start()
        .succeed();
      await Promise.all([
        useRuntimeWorkers(),
        useIOTBridge(),
        useRuntimeServer(),
        useNodeHandler(),
        useMetadata(),
        useFunctionLogger(),
        useStackBuilder()
      ]);
    }
  );

const useFunctionLogger = Context.memo(async () => {
  const bus = useBus();

  bus.subscribe("function.invoked", async evt => {
    const functions = await useFunctions();
    const func = functions[evt.properties.functionID];
    console.log(bold(magenta(`Invoked `)), bold(func.id));
  });

  bus.subscribe("worker.stdout", async evt => {
    const functions = await useFunctions();
    const func = functions[evt.properties.functionID];
    console.log(bold(blue(`Log     `)), bold(func.id), evt.properties.message);
  });

  bus.subscribe("function.success", async evt => {
    const functions = await useFunctions();
    const func = functions[evt.properties.functionID];
    console.log(bold(green(`Success `)), bold(func.id));
  });
});

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { CloudAssembly } from "aws-cdk-lib/cx-api";
import readline from "readline";

const useStackBuilder = Context.memo(async () => {
  const watcher = useWatcher();
  const bus = useBus();

  let checksum: string;
  let pending: CloudAssembly | undefined;

  async function build() {
    const spinner = ora("Building stacks").start();
    const fn = await Stacks.build();
    const assembly = await Stacks.synth({
      fn,
      mode: "start"
    });
    Logger.debug("Directory", assembly.directory);
    const next = await generateChecksum(assembly.directory);
    Logger.debug("Checksum", "next", next, "old", checksum);
    if (next === checksum) {
      spinner.succeed("Stacks built! No changes");
      return;
    }
    spinner.succeed(
      checksum
        ? `Stacks built! Press ${blue("enter")} to deploy`
        : `Stacks built!`
    );
    pending = assembly;
  }

  async function deploy() {
    if (!pending) return;
    process.stdout.write("\x1b[?1049h");
    const component = render(
      <DeploymentUI stacks={pending.stacks.map(s => s.stackName)} />
    );
    await Stacks.deployMany(pending.stacks);
    component.unmount();
    process.stdout.write("\x1b[?1049l");
    checksum = await generateChecksum(pending.directory);
    pending = undefined;
  }

  async function generateChecksum(cdkOutPath: string) {
    const manifestPath = path.join(cdkOutPath, "manifest.json");
    const cdkManifest = JSON.parse(
      await fs.readFile(manifestPath).then(x => x.toString())
    );
    const checksumData = await Promise.all(
      Object.keys(cdkManifest.artifacts)
        .filter(
          (key: string) =>
            cdkManifest.artifacts[key].type === "aws:cloudformation:stack"
        )
        .map(async (key: string) => {
          const { templateFile } = cdkManifest.artifacts[key].properties;
          const templatePath = path.join(cdkOutPath, templateFile);
          const templateContent = await fs.readFile(templatePath);
          return templateContent;
        })
    ).then(x => x.join("\n"));
    const hash = crypto
      .createHash("sha256")
      .update(checksumData)
      .digest("hex");
    return hash;
  }

  let metafile: Metafile;
  bus.subscribe("stack.built", async evt => {
    metafile = evt.properties.metafile;
  });

  watcher.subscribe("file.changed", async evt => {
    if (!metafile) return;
    if (!metafile.inputs[evt.properties.relative]) return;
    build();
  });

  await build();
  await deploy();
});
