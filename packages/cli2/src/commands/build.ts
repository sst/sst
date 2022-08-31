import { Stacks } from "../stacks/index.js";
import { useConfig } from "../config/index.js";

export async function Build() {
  console.time("build");
  const fn = await Stacks.build();
  const cfg = await useConfig();
  console.timeEnd("build");

  console.time("synth");
  const { App } = await import("@serverless-stack/resources");
  const app = new App({
    stage: cfg.stage,
    name: cfg.name,
    region: cfg.region,
    buildDir: ".sst/stacks/",
    skipBuild: true,
  });
  try {
    await fn(app);
    console.log(app.synth());
  } catch (err) {
    console.log(err);
    throw err;
  }
  console.timeEnd("synth");
}
