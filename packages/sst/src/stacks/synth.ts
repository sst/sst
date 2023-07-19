import { Logger } from "../logger.js";
import type { App } from "../constructs/App.js";
import { useProject } from "../project.js";
import { useAWSProvider, useSTSIdentity } from "../credentials.js";
import * as contextproviders from "sst-aws-cdk/lib/context-providers/index.js";
import path from "path";
import { VisibleError } from "../error.js";
import { useDotnetHandler } from "../runtime/handlers/dotnet.js";
import { CloudAssembly } from "aws-cdk-lib/cx-api";
import * as cas from "aws-cdk-lib/cloud-assembly-schema";

interface SynthOptions {
  buildDir?: string;
  outDir?: string;
  increaseTimeout?: boolean;
  scriptVersion?: string;
  mode: App["mode"];
  fn: (app: App) => Promise<void> | void;
  isActiveStack?: (stackName: string) => boolean;
}

export async function synth(opts: SynthOptions) {
  Logger.debug("Synthesizing stacks...");
  const { App } = await import("../constructs/App.js");
  const { useNodeHandler } = await import("../runtime/handlers/node.js");
  const { useGoHandler } = await import("../runtime/handlers/go.js");
  const { useContainerHandler } = await import(
    "../runtime/handlers/container.js"
  );
  const { useRustHandler } = await import("../runtime/handlers/rust.js");
  const { usePythonHandler } = await import("../runtime/handlers/python.js");
  const { useJavaHandler } = await import("../runtime/handlers/java.js");
  useNodeHandler();
  useGoHandler();
  useContainerHandler();
  usePythonHandler();
  useJavaHandler();
  useDotnetHandler();
  useRustHandler();
  const cxapi = await import("@aws-cdk/cx-api");
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
        debugScriptVersion: opts.scriptVersion,
        isActiveStack: opts.isActiveStack,
      },
      {
        outdir: opts.buildDir,
        context: {
          ...cfg.context.all,
          [cxapi.PATH_METADATA_ENABLE_CONTEXT]:
            project.config.cdk?.pathMetadata ?? false,
        },
      }
    );

    await opts.fn(app);
    await app.finish();
    const assembly = app.synth();
    processMetadataMessages(assembly, {});
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

  function processMetadataMessages(assembly: CloudAssembly, options: MetadataMessageOptions = {}) {

    const warning = console.log
    const error = console.error

    let warnings = false;
    let errors = false;
    for (const stack of assembly.stacks) {
      for (const message of stack.messages) {
	switch (message.level) {
          case cxapi.SynthesisMessageLevel.WARNING:
            warnings = true;
            printMessage(warning, 'Warning', message.id, message.entry);
            break;
          case cxapi.SynthesisMessageLevel.ERROR:
            errors = true;
            printMessage(error, 'Error', message.id, message.entry);
            break;
          case cxapi.SynthesisMessageLevel.INFO:
            printMessage(print, 'Info', message.id, message.entry);
            break;
	}
      }
    }

    if (errors && !options.ignoreErrors) {
      throw new Error('Found errors');
    }

    if (options.strict && warnings) {
      throw new Error('Found warnings (--strict mode)');
    }

    function printMessage(logFn: (s: string) => void, prefix: string, id: string, entry: cas.MetadataEntry) {
      logFn(`[${prefix} at ${id}] ${entry.data}`);

      if (options.verbose && entry.trace) {
	logFn(`  ${entry.trace.join('\n  ')}`);
      }
    }

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

export interface MetadataMessageOptions {
  /**
   * Whether to be verbose
   *
   * @default false
   */
  verbose?: boolean;

  /**
   * Don't stop on error metadata
   *
   * @default false
   */
  ignoreErrors?: boolean;

  /**
   * Treat warnings in metadata as errors
   *
   * @default false
   */
  strict?: boolean;
}
