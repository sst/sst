import spawn from "cross-spawn";
import { AssetCode, Runtime } from "aws-cdk-lib/aws-lambda";
import { Writable } from "node:stream";
import { logger } from "../../logger.js";


export type Command = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

type BundleResult = {
  handler: string;
  overrideRuntime?: Runtime; // Enables bundler to override function runtime, e.g. to swap to a custom runtime
} & (
    | {
      asset: AssetCode; // Current python builder docker approach requires this
    }
    | {
      directory: string;
    }
  );

export type Instructions = {
  // Pass in file change that is triggering
  shouldBuild?: (files: string[]) => boolean;
  build: () => Promise<Issue[]>;
  bundle: () => Promise<BundleResult>;
  run: Command;
  watcher: {
    include: string[];
    ignore: string[];
  };
  checks?: Record<string, () => Promise<Issue[]>>;
};

export type Issue = {
  location: {
    file: string;
    column?: number;
    line?: number;
    length?: number;
  };
  message: string;
};

export type Opts<T = any> = {
  id: string;
  root: string;
  runtime: string;
  srcPath: string;
  handler: string;
  bundle?: T | false;
};

export type Definition<T = any> = (opts: Opts<T>) => Instructions;

export function buildAsync(opts: Opts, cmd: Command) {
  logger.debug(`buildAsync launching: ${cmd.command} ${cmd.args.join(' ')}`)
  const proc = spawn(cmd.command, cmd.args, {
    env: {
      ...cmd.env,
      ...process.env,
    },
    cwd: opts.srcPath,
  });
  return new Promise<Issue[]>((resolve) => {
    let buffer = "";

    let writeToConsole = logger.isDebugEnabled() || (!!process.env.SST_BUILD_OUTPUT);
    let collect = writeToConsole ? 
      (data: string, stream: Writable) => { stream.write(data); buffer += data } :
      (data: string, stream: Writable) => (buffer += data) 
    
    proc.stdout?.on("data", (data) => collect(data, process.stdout));
    proc.stderr?.on("data", (data) => collect(data, process.stderr));
    proc.on("exit", () => {      
      if (proc.exitCode === 0) {
        resolve([]);
      }
      if (proc.exitCode !== 0) {
        resolve([
          {
            location: {
              file: [opts.srcPath, opts.handler].join("/"),
            },
            message: buffer,
          },
        ]);
      }
    });
  });
}

export async function buildAsyncAndThrow(opts: Opts, cmd: Command) {
  const issues = await buildAsync(opts, cmd);
  if (issues.length > 0) {
    throw new Error(issues.map((i) => i.message.toString()).join("\n"));
  }
}
