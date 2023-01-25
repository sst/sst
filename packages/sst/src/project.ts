import fs from "fs/promises";
import { Metafile } from "esbuild";
import fsSync from "fs";
import path from "path";
import url from "url";
import os from "os";
import { Logger } from "./logger.js";
import { Context } from "./context/context.js";
import { VisibleError } from "./error.js";
import { blue } from "colorette";
import dotenv from "dotenv";
import type { App } from "./constructs/App.js";
import { load } from "./stacks/build.js";

export interface SSTConfig {
  config: (globals: GlobalOptions) => Promise<ConfigOptions> | ConfigOptions;
  stacks: (app: App) => Promise<void> | void;
}

export interface ConfigOptions {
  name: string;
  region?: string;
  stage?: string;
  profile?: string;
  role?: string;
  ssmPrefix?: string;
}

const DEFAULTS = {
  stage: undefined,
  ssmPrefix: undefined,
} as const;

interface Project {
  config: ConfigOptions &
  Required<{
    [key in keyof typeof DEFAULTS]: Exclude<ConfigOptions[key], undefined>;
  }>;
  version: string;
  cdkVersion: string;
  paths: {
    root: string;
    config: string;
    out: string;
    artifacts: string;
  };
  metafile: Metafile;
  stacks: SSTConfig["stacks"];
}

export const ProjectContext = Context.create<Project>();

export function useProject() {
  return ProjectContext.use();
}

const CONFIG_EXTENSIONS = [
  ".config.ts",
  ".config.mts",
  ".config.cts",
  ".config.cjs",
  ".config.mjs",
  ".config.js",
];

interface GlobalOptions {
  profile?: string;
  role?: string;
  stage?: string;
  root?: string;
  region?: string;
}

export async function initProject(globals: GlobalOptions) {
  const root = globals.root || (await findRoot());
  const out = path.join(root, ".sst");
  await fs.mkdir(out, {
    recursive: true,
  });

  let file: string | undefined;
  const [metafile, sstConfig] = await (async function () {
    for (const ext of CONFIG_EXTENSIONS) {
      file = path.join(root, "sst" + ext);
      if (!fsSync.existsSync(file)) continue;
      const [metafile, config] = await load(file);
      return [metafile, config as SSTConfig];
    }

    throw new VisibleError(
      "Could not found a configuration file",
      "Make sure one of the following exists",
      ...CONFIG_EXTENSIONS.map((x) => `  - sst${x}`)
    );
  })();

  const config = await Promise.resolve(sstConfig.config(globals));
  const stage =
    globals.stage ||
    config.stage ||
    (await usePersonalStage(out)) ||
    (await promptPersonalStage(out));
  const [version, cdkVersion] = await (async () => {
    try {
      const packageJson = JSON.parse(
        await fs
          .readFile(
            url.fileURLToPath(new URL("./package.json", import.meta.url))
          )
          .then((x) => x.toString())
      );
      return [packageJson.version, packageJson.dependencies["aws-cdk-lib"]];
    } catch {
      return ["unknown", "unknown"];
    }
  })();
  const project: Project = {
    version,
    cdkVersion,
    config: {
      ...config,
      stage,
      profile: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? undefined
        : (globals.profile || config.profile),
      region: globals.region || config.region,
      role: globals.role || config.role,
      ssmPrefix: config.ssmPrefix || `/sst/${config.name}/${stage}/`,
    },
    stacks: sstConfig.stacks,
    metafile,
    paths: {
      config: file!,
      root,
      out,
      artifacts: path.join(out, "artifacts"),
    },
  };

  ProjectContext.provide(project);
  const { initBootstrap } = await import("./bootstrap.js");
  await initBootstrap();
  dotenv.config({
    path: path.join(project.paths.root, `.env.${project.config.stage}`),
    override: true,
  });

  Logger.debug("Config loaded", project);
}

async function usePersonalStage(out: string) {
  try {
    const result = await fs.readFile(path.join(out, "stage"));
    return result.toString("utf8").trim();
  } catch {
    return;
  }
}

async function promptPersonalStage(out: string) {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise<string>((resolve) => {
    const suggested = os.userInfo().username;
    rl.question(
      `Please enter a name you’d like to use for your personal stage. Or hit enter to use ${blue(
        suggested
      )}: `,
      async (input) => {
        rl.close();
        const result = input || suggested;
        await fs.writeFile(path.join(out, "stage"), result);
        resolve(result);
      }
    );
  });
}

async function findRoot() {
  async function find(dir: string): Promise<string> {
    if (dir === "/")
      throw new VisibleError(
        "Could not found a configuration file",
        "Make sure one of the following exists",
        ...CONFIG_EXTENSIONS.map((ext) => `  - sst${ext}`)
      );
    for (const ext of CONFIG_EXTENSIONS) {
      const configPath = path.join(dir, `sst${ext}`);
      if (fsSync.existsSync(configPath)) {
        return dir;
      }
    }
    return await find(path.join(dir, ".."));
  }
  const result = await find(process.cwd());
  return result;
}
