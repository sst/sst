import { useBus } from "../bus/index.js";
import { useIOT } from "../iot/index.js";
import { Logger } from "../logger/index.js";
import { createRuntimeServer } from "../runtime/runtime.js";
import { Stacks } from "../stacks/index.js";

export async function start() {
  await useIOT();
  await createRuntimeServer();
  Logger.debug("Listening for function invocations...");

  const fn = await Stacks.build();
  const assembly = await Stacks.synth({
    fn,
    mode: "start",
  });
  await Stacks.deployMany(assembly.stacks);
  console.log("Finished deploying");
}
