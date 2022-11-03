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

const useStackBuilder = Context.memo(async () => {
  const watcher = useWatcher();
  const bus = useBus();

  async function build() {
    const fn = await Stacks.build();
    const assembly = await Stacks.synth({
      fn,
      mode: "start",
    });
    process.stdout.write("\x1b[?1049h");
    const component = render(
      <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
    );
    await Stacks.deployMany(assembly.stacks);
    component.unmount();
    process.stdout.write("\x1b[?1049l");
    console.log("Stacks updated");
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
});
