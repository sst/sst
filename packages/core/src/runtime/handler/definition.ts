import spawn from "cross-spawn";
import { AssetCode } from "@aws-cdk/aws-lambda";

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
  build?: () => Promise<void>;
  bundle: () => BundleResult;
  run: Command;
  watcher: {
    include: string[];
    ignore: string[];
  };
  checks?: Record<string, () => Promise<void>>;
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
  const proc = spawn(cmd.command, cmd.args, {
    env: {
      ...cmd.env,
      ...process.env,
    },
    cwd: opts.srcPath,
  });
  return new Promise<void>((resolve, reject) => {
    let buffer = "";
    proc.stdout?.on("data", (data) => (buffer += data));
    proc.stderr?.on("data", (data) => (buffer += data));
    proc.on("exit", () => {
      if (proc.exitCode === 0) resolve();
      if (proc.exitCode !== 0) {
        reject(buffer);
      }
    });
  });
}

export function buildSync(opts: Opts, cmd: Command) {
  const result = spawn.sync(cmd.command, cmd.args, {
    env: {
      ...cmd.env,
      ...process.env,
    },
    cwd: opts.srcPath,
  });
  if (result.status !== 0)
    throw new Error(result.output.map((b) => b?.toString()).join("\n"));
}
