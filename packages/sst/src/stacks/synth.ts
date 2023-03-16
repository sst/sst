import { Logger } from "../logger.js";
import type { App } from "../constructs/App.js";
import { useProject } from "../project.js";
import { useAWSProvider, useSTSIdentity } from "../credentials.js";
import * as contextproviders from "sst-aws-cdk/lib/context-providers/index.js";
import path from "path";
import { VisibleError } from "../error.js";
import { useDotnetHandler } from "../runtime/handlers/dotnet.js";

interface SynthOptions {
  buildDir?: string;
  outDir?: string;
  skipBuild?: boolean;
  increaseTimeout?: boolean;
  mode: App["mode"];
  fn: (app: App) => Promise<void> | void;
}

export async function synth(opts: SynthOptions) {
  Logger.debug("Synthesizing stacks...");
  const { App } = await import("../constructs/App.js");
  const { useNodeHandler } = await import("../runtime/handlers/node.js");
  const { useGoHandler } = await import("../runtime/handlers/go.js");
  const { useRustHandler } = await import("../runtime/handlers/rust.js");
  const { usePythonHandler } = await import("../runtime/handlers/python.js");
  const { useJavaHandler } = await import("../runtime/handlers/java.js");
  useNodeHandler();
  useGoHandler();
  usePythonHandler();
  useJavaHandler();
  useDotnetHandler();
  useRustHandler();
  const { Configuration } = await import("sst-aws-cdk/lib/settings.js");
  const project = useProject();
  const identity = await useSTSIdentity();
  opts = {
    ...opts,
    buildDir: opts.buildDir || path.join(project.paths.out, "dist"),
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
        stage: project.config.stage,
        name: project.config.name,
        region: project.config.region,
        mode: opts.mode,
        debugIncreaseTimeout: opts.increaseTimeout,
        skipBuild: opts.mode === "remove",
      },
      {
        outdir: opts.buildDir,
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
        throw new VisibleError(formatErrorMessage(next.join("")));
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

function formatErrorMessage(message: string) {
  return (
    formatCustomDomainError(message) ||
    `Could not resolve context values for ${message}`
  );
}

function formatCustomDomainError(message: string) {
  const ret = message.match(/hosted-zone:account=\d+:domainName=(\S+):/);
  if (!ret) {
    return;
  }

  const hostedZone = ret && ret[1];
  return [
    `It seems you are configuring custom domains for you URL.`,
    hostedZone
      ? `And SST is not able to find the hosted zone "${hostedZone}" in your AWS Route 53 account.`
      : `And SST is not able to find the hosted zone in your AWS Route 53 account.`,
    `Please double check and make sure the zone exists, or pass in a different zone.`,
  ].join(" ");
}
