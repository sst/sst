import path from "path";
import { build } from "./build.js";
import { deploy, deployMany, isFailed, isFinal, isSuccess } from "./deploy.js";
import { useSTSIdentity } from "../credentials.js";
import { useBootstrap } from "../bootstrap.js";
import { Logger } from "../logger.js";
import type { App } from "../constructs/App.js";
import { useProject } from "../app.js";

interface SynthOptions {
  buildDir?: string;
  outDir?: string;
  skipBuild?: boolean;
  mode: App["mode"];
  fn: (app: App) => Promise<void> | void;
}

async function synth(opts: SynthOptions) {
  Logger.debug("Synthesizing stacks...");
  const { App } = await import("../constructs/App.js");
  const { Configuration } = await import("aws-cdk/lib/settings.js");
  const project = useProject();
  const [identity] = await Promise.all([useSTSIdentity(), useBootstrap()]);
  opts = {
    buildDir: path.join(project.paths.out, "cdk.out"),
    ...opts,
  };

  const cfg = new Configuration();
  await cfg.load();
  const bootstrap = await useBootstrap();
  const app = new App(
    {
      account: identity.Account!,
      stage: project.stage,
      name: project.name,
      region: project.region,
      mode: opts.mode,
      skipBuild: opts.mode !== "deploy",
      bootstrap,
    },
    {
      outdir: opts.buildDir || path.join(project.paths.out, "cdk.out"),
      context: cfg.context.all,
    }
  );

  await opts.fn(app);
  await app.runDeferredBuilds();
  /*
  console.log(JSON.stringify(cfg.context));
  const executable = new CloudExecutable({
    sdkProvider: await useAWSProvider(),
    configuration: cfg,
    synthesizer: async () => app.synth() as any
  });
  const { assembly } = await executable.synthesize(true);
  */
  const assembly = app.synth();
  await cfg.saveContext();
  Logger.debug("Finished synthesizing");
  return assembly;
}

export const Stacks = {
  build,
  deploy,
  isFinal,
  isSuccess,
  isFailed,
  deployMany,
  synth,
};
