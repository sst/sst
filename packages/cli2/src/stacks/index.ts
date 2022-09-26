import path from "path";
import { build } from "./build.js";
import { deploy } from "./deploy.js";
import { App } from "@serverless-stack/resources";
import { useSTSIdentity } from "../credentials/index.js";
import { useProjectRoot, useConfig } from "../config/index.js";
import { useBootstrap } from "../bootstrap/index.js";
import { Logger } from "../logger/index.js";
import { useStateDirectory } from "../state/index.js";

interface SynthOptions {
  buildDir?: string;
  outDir?: string;
  skipBuild?: boolean;
  fn: (app: App) => Promise<void> | void;
}
async function synth(opts: SynthOptions) {
  Logger.debug("Synthesizing stacks...");
  opts = {
    buildDir: ".sst/out",
    ...opts,
  };
  const [identity, config, bootstrap] = await Promise.all([
    useSTSIdentity(),
    useConfig(),
    useBootstrap(),
  ]);

  const app = new App(
    {
      account: identity.Account!,
      stage: config.stage,
      name: config.name,
      region: config.region,
      skipBuild: opts.skipBuild || false,
      bootstrapAssets: {
        bucketName: bootstrap.bucket,
        version: bootstrap.version,
        stackName: bootstrap.stack,
      },
    },
    {
      outdir: opts.buildDir || path.join(await useStateDirectory(), "out"),
    }
  );

  await opts.fn(app);
  const asm = app.synth();
  Logger.debug("Finished synthesizing");
  return asm;
}

export const Stacks = {
  build,
  deploy,
  synth,
};
