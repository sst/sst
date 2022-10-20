import { bold, magenta, green, blue } from "colorette";
import { render } from "ink";
import React from "react";
import { useBus } from "../../bus/index.js";
import { Logger } from "../../logger/index.js";
import { useFunctions } from "../../runtime/handlers.js";
import { useIOTBridge } from "../../runtime/iot.js";
import { useNodeHandler } from "../../runtime/node.js";
import { useRuntimeServer } from "../../runtime/server.js";
import { useRuntimeWorkers } from "../../runtime/workers.js";
import { Stacks } from "../../stacks/index.js";
import { useMetadata } from "../../stacks/metadata.js";
import { useWatcher } from "../../watcher/watcher.js";
import { Context } from "@serverless-stack/node/context/index.js";

import { DeploymentUI } from "./deploy.js";
import { Metafile } from "esbuild";

export async function start() {
  const [workers] = await Promise.all([
    useRuntimeWorkers(),
    useIOTBridge(),
    useRuntimeServer(),
    useNodeHandler(),
    useMetadata(),
    useStackBuilder(),
    useFunctionLogger(),
  ]);

  Logger.ui("green", "Listening for function invocations...");
}

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
  const watcher = await useWatcher();
  const bus = useBus();

  async function build() {
    const fn = await Stacks.build();
    const assembly = await Stacks.synth({
      fn,
      mode: "start",
    });
    // process.stdout.write("\x1b[?1049h");
    const component = render(
      <DeploymentUI stacks={assembly.stacks.map((s) => s.stackName)} />
    );
    await Stacks.deployMany(assembly.stacks);
    component.unmount();
    // process.stdout.write("\x1b[?1049l");
    Logger.ui("green", "Stacks updated");
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
