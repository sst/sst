import { bold, magenta, green, blue, red, yellow } from "colorette";
import { render } from "ink";
import React from "react";
import { Context } from "@serverless-stack/node/context/index.js";

import { DeploymentUI } from "../ui/deploy.js";
import { Metafile } from "esbuild";
import ora from "ora";

export const start = (program: Program) =>
  program.command(
    "start",
    "Work on your SST app locally",
    (yargs) => yargs,
    async () => {
      ora("Listening for function invocations").start().succeed();
      await Promise.all([
        useRuntimeWorkers(),
        useIOTBridge(),
        useRuntimeServer(),
        useNodeHandler(),
        useMetadata(),
        useFunctionLogger(),
        useStackBuilder(),
      ]);
    }
  );

const useFunctionLogger = Context.memo(async () => {
  const bus = useBus();

  bus.subscribe("function.invoked", async (evt) => {
    const functions = await useFunctions();
    const func = functions[evt.properties.functionID];
    console.log(bold(magenta(`Invoked `)), bold(func.id));
  });

  bus.subscribe("worker.stdout", async (evt) => {
    const functions = await useFunctions();
    const func = functions[evt.properties.functionID];
    console.log(bold(blue(`Log     `)), bold(func.id), evt.properties.message);
  });

  bus.subscribe("function.success", async (evt) => {
    const functions = await useFunctions();
    const func = functions[evt.properties.functionID];
    console.log(bold(green(`Success `)), bold(func.id));
  });
});

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { CloudAssembly } from "aws-cdk-lib/cx-api";
import { Program } from "../program.js";
import { useRuntimeWorkers } from "../../runtime/workers.js";
import { useIOTBridge } from "../../runtime/iot.js";
import { useRuntimeServer } from "../../runtime/server.js";
import { useNodeHandler } from "../../runtime/node.js";
import { useFunctions, useMetadata } from "../../stacks/metadata.js";
import { useBus } from "../../bus.js";
import { useWatcher } from "../../watcher.js";
import { Stacks } from "../../stacks/index.js";
import { Logger } from "../../logger.js";
import { createSpinner } from "../spinner.js";

const useStackBuilder = Context.memo(async () => {
  const watcher = useWatcher();
  const bus = useBus();

  let lastDeployed: string;
  let pending: CloudAssembly | undefined;
  let isDeploying = false;

  async function build() {
    const spinner = createSpinner("Building stacks").start();
    const fn = await Stacks.build();
    const assembly = await Stacks.synth({
      fn,
      outDir: `.sst/${Math.random()}`,
      mode: "start",
    });
    Logger.debug("Directory", assembly.directory);
    const next = await generateChecksum(assembly.directory);
    Logger.debug("Checksum", "next", next, "old", lastDeployed);
    if (next === lastDeployed) {
      spinner.succeed("Stacks built! No changes");
      return;
    }
    spinner.succeed(lastDeployed ? `Stacks built!` : `Stacks built!`);
    pending = assembly;
    if (lastDeployed) deploy();
  }

  async function deploy() {
    if (!pending) return;
    if (isDeploying) return;
    isDeploying = true;
    const assembly = pending;
    const nextChecksum = await generateChecksum(assembly.directory);
    pending = undefined;
    process.stdout.write("\x1b[?1049h");
    const component = render(
      <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
    );
    const results = await Stacks.deployMany(assembly.stacks);
    component.unmount();
    process.stdout.write("\x1b[?1049l");
    lastDeployed = nextChecksum;
    console.log(`----------------------------`);
    console.log(`| Stack deployment results |`);
    console.log(`----------------------------`);
    for (const [stack, result] of Object.entries(results)) {
      const icon = (() => {
        if (Stacks.isSuccess(result.status)) return green("✔");
        if (Stacks.isFailed(result.status)) return red("✖");
      })();
      console.log(`${icon} ${stack}`);
      for (const [id, error] of Object.entries(result.errors)) {
        console.log(bold(`  ${id}: ${error}`));
      }
    }
    isDeploying = false;
    deploy();
  }

  async function generateChecksum(cdkOutPath: string) {
    const manifestPath = path.join(cdkOutPath, "manifest.json");
    const cdkManifest = JSON.parse(
      await fs.readFile(manifestPath).then((x) => x.toString())
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
    ).then((x) => x.join("\n"));
    const hash = crypto.createHash("sha256").update(checksumData).digest("hex");
    return hash;
  }

  let metafile: Metafile;
  bus.subscribe("stack.built", async (evt) => {
    metafile = evt.properties.metafile;
  });

  watcher.subscribe("file.changed", async (evt) => {
    if (!metafile) return;
    if (!metafile.inputs[evt.properties.relative]) return;
    build();
  });

  await build();
  await deploy();
});
