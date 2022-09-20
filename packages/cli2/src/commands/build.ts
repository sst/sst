import { Stacks } from "../stacks/index.js";
import { useConfig } from "../config/index.js";
import { Logger } from "../logger/index.js";

export async function Build() {
  Logger.debug("Building stacks...");
  const fn = await Stacks.build();
  Logger.debug("Finished building");
  const cfg = await useConfig();

  Logger.debug("Synthesizing stacks...");
  const { App } = await import("@serverless-stack/resources");
  const app = new App({
    stage: cfg.stage,
    name: cfg.name,
    region: cfg.region,
    buildDir: ".sst/stacks/",
    skipBuild: true
  });
  try {
    await fn(app);
    Logger.debug("Finished synthesizing");
  } catch (err) {
    throw err;
  }
}
