import spawn from "cross-spawn";
import { AssetCode } from "aws-cdk-lib/aws-lambda";
import { getChildLogger } from "../../logger.js";
const logger = getChildLogger("runtime");

export type Command = {
  command: string;
  args: string[];
  env: Record<string, string>;
};

type BundleResult = {
  handler: string;
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
  logger.debug(`buildAsync spawning: ${cmd.command} ${cmd.args.join(' ')}`)
  const proc = spawn(cmd.command, cmd.args, {
    env: {
      ...cmd.env,
      ...process.env,
    },
    cwd: opts.srcPath,
  });
  // Print out stdout and stderr in real time if DEBUG is set,
  // otherwise, just print out if build fails.
  const isDebug = process.env.DEBUG;
  return new Promise<Issue[]>((resolve) => {
    let buffer = "";
    proc.stdout?.on("data", (data) => {
      buffer += data;
      isDebug && logger.debug(data);
    });
    proc.stderr?.on("data", (data) => {
      buffer += data;
      isDebug && logger.debug(data);
    });
    // Note: in the case of Java runtime, if gradle is not found,
    // "on error" will get called. "on exit" will not get called.
    proc.on("error", (e) => {
      logger.error(e.message);
      resolve([
        {
          location: {
            file: [opts.srcPath, opts.handler].join("/"),
          },
          message: e.message,
        },
      ]);
    });
    proc.on("exit", () => {
      if (proc.exitCode === 0) resolve([]);
      if (proc.exitCode !== 0) {
        !isDebug && logger.error(buffer);
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
