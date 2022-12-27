import { Logger } from "../logger.js";
import type { App } from "../constructs/App.js";
import { useProject } from "../app.js";
import { useAWSProvider, useSTSIdentity } from "../credentials.js";
import { useBootstrap } from "../bootstrap.js";
import * as contextproviders from "aws-cdk/lib/context-providers/index.js";
import path from "path";
import { VisibleError } from "../error.js";

interface SynthOptions {
  buildDir?: string;
  outDir?: string;
  skipBuild?: boolean;
  mode: App["mode"];
  fn: (app: App) => Promise<void> | void;
}

export async function synth(opts: SynthOptions) {
  Logger.debug("Synthesizing stacks...");
  const { App } = await import("../constructs/App.js");
  const { useNodeHandler } = await import("../runtime/handlers/node.js");
  const { useGoHandler } = await import("../runtime/handlers/go.js");
  const { usePythonHandler } = await import("../runtime/handlers/python.js");
  const { useJavaHandler } = await import("../runtime/handlers/java.js");
  useNodeHandler();
  useGoHandler();
  usePythonHandler();
  useJavaHandler();
  const { Configuration } = await import("aws-cdk/lib/settings.js");
  const project = useProject();
  const [identity, bootstrap] = await Promise.all([
    useSTSIdentity(),
    useBootstrap(),
  ]);
  opts = {
    buildDir: path.join(project.paths.out, "cdk.out"),
    ...opts,
  };

  /*
  console.log(JSON.stringify(cfg.context));
  const executable = new CloudExecutable({
    sdkProvider: await useAWSProvider(),
    configuration: cfg,
    synthesizer: async () => app.synth() as any
  });
  const { assembly } = await executable.synthesize(true);
  */
  const cfg = new Configuration();
  await cfg.load();
  let previous = new Set<string>();
  while (true) {
    const app = new App(
      {
        account: identity.Account!,
        stage: project.stage,
        name: project.name,
        region: project.region,
        mode: opts.mode,
        skipBuild: opts.mode === "remove",
        bootstrap,
      },
      {
        outdir: opts.buildDir || path.join(project.paths.out, "cdk.out"),
        context: cfg.context.all,
      }
    );

    await opts.fn(app);
    await app.finish();
    const assembly = app.synth();
    Logger.debug(assembly.manifest.missing);
    const { missing } = assembly.manifest;
    const provider = await useAWSProvider();

    if (missing && missing.length) {
      const next = missing.map((x) => x.key);
      if (next.length === previous.size && next.every((x) => previous.has(x)))
        throw new VisibleError(`Could not resolve context values for ${next}`);
      Logger.debug("Looking up context for:", next, "Previous:", previous);
      previous = new Set(next);
      await contextproviders.provideContextValues(
        missing,
        cfg.context,
        provider
      );
      if (cfg.context.keys.length) {
        await cfg.saveContext();
      }
      continue;
    }
    Logger.debug("Finished synthesizing");
    return assembly;
  }
}
