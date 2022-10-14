import { render } from "ink";
import React from "react";
import { useBus } from "../bus/index.js";
import { useIOT } from "../iot/index.js";
import { Logger } from "../logger/index.js";
import { createRuntimeServer } from "../runtime/runtime.js";
import { createNodeWorker } from "../runtime/workers.js";
import { Stacks } from "../stacks/index.js";

import { DeploymentUI } from "./deploy.js";

export async function start() {
  await useIOT();
  await createNodeWorker();
  await createRuntimeServer();
  Logger.ui("green", "Listening for function invocations...");

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
  Logger.ui("green", "Stacks updated");
}
