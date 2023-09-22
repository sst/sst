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
  outputs?: string;
  advanced?: {
    disableParameterizedStackNameCheck?: boolean;
    disableAppModeCheck?: boolean;
  };
  bootstrap?: {
    useCdkBucket?: boolean;
    stackName?: string;
    tags?: Record<string, string>;
  };
  cdk?: {
    toolkitStackName?: string;
    qualifier?: string;
    bootstrapStackVersionSsmParameter?: string;
    fileAssetsBucketName?: string;
    customPermissionsBoundary?: string;
    publicAccessBlockConfiguration?: boolean;
    deployRoleArn?: string;
    fileAssetPublishingRoleArn?: string;
    imageAssetPublishingRoleArn?: string;
    imageAssetsRepositoryName?: string;
    cloudFormationExecutionRole?: string;
    lookupRoleArn?: string;
    pathMetadata?: boolean;
  };
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
  constructsVersion: string;
  paths: {
    root: string;
    config: string;
    out: string;
    artifacts: string;
  };
  metafile: Metafile;
  stacks: SSTConfig["stacks"];
}

let project: Project | undefined;

export function useProject() {
  if (!project) throw new Error("Project not initialized");
  return project;
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
  // Logger.debug("initing project");
  const root = globals.root || (await findRoot());
  const out = path.join(root, ".sst");
  await fs.mkdir(out, {
    recursive: true,
  });
  // Logger.debug("made out dir");

  let file: string | undefined;
  const [metafile, sstConfig] = await (async function () {
    for (const ext of CONFIG_EXTENSIONS) {
      file = path.join(root, "sst" + ext);
      if (!fsSync.existsSync(file)) continue;
      // Logger.debug("found sst config");
      const [metafile, config] = await load(file, true);
      // Logger.debug("loaded sst config");
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
    process.env.SST_STAGE ||
    globals.stage ||
    config.stage ||
    (await usePersonalStage(out)) ||
    (await promptPersonalStage(out));
  // Set stage to SST_STAGE so that if SST spawned processes are aware
  // of the stage. ie.
  // `sst deploy --stage prod`: `prod` stage passed in via CLI
  // -> spawns `open-next build`
  // -> spawns `sst bind`: `prod` stage read from SST_STAGE
  process.env.SST_STAGE = stage;
  const [version, cdkVersion, constructsVersion] = await (async () => {
    try {
      const packageJson = JSON.parse(
        await fs
          .readFile(
            url.fileURLToPath(new URL("./package.json", import.meta.url))
          )
          .then((x) => x.toString())
      );
      return [
        packageJson.version,
        packageJson.dependencies["aws-cdk-lib"],
        packageJson.dependencies["constructs"],
      ];
    } catch {
      return ["unknown", "unknown"];
    }
  })();
  project = {
    version,
    cdkVersion,
    constructsVersion,
    config: {
      ...config,
      stage,
      profile:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? undefined
          : globals.profile || config.profile,
      region: globals.region || config.region,
      role: globals.role || config.role,
      ssmPrefix: config.ssmPrefix || `/sst/${config.name}/${stage}/`,
      bootstrap: config.bootstrap,
      cdk: config.cdk,
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

  // Cleanup old config files
  (async function () {
    const files = await fs.readdir(project.paths.root);
    for (const file of files) {
      if (file.startsWith(".sst.config")) {
        // Do not remove recently generated config files. This allows for multiple
        // SST processes to run concurrently.
        const timeGenerated = (file.match(/\b\d{13}\b/g) ?? []).at(0);
        if (timeGenerated && Date.now() - parseInt(timeGenerated, 10) < 30000) {
          continue;
        }
        await fs.unlink(path.join(project.paths.root, file));
        Logger.debug(`Removed old config file ${file}`);
      }
    }
  })();

  // Load .env files
  [
    path.join(project.paths.root, `.env`),
    path.join(project.paths.root, `.env.local`),
    path.join(project.paths.root, `.env.${project.config.stage}`),
    path.join(project.paths.root, `.env.${project.config.stage}.local`),
  ].forEach((path) => dotenv.config({ path, override: true }));

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

async function promptPersonalStage(
  out: string,
  isRetry?: boolean
): Promise<string> {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const stage = await new Promise<string>((resolve) => {
    const suggested = sanitizeStageName(os.userInfo().username) || "local";
    const instruction = !isRetry
      ? `Please enter a name you’d like to use for your personal stage.`
      : `Please enter a name that starts with a letter, followed by letters, numbers, or hyphens.`;
    rl.question(
      `${instruction} Or hit enter to use ${blue(suggested)}: `,
      async (input) => {
        rl.close();
        const result = input === "" ? suggested : input;
        resolve(result);
      }
    );
  });

  // Validate stage name
  if (isValidStageName(stage)) {
    await fs.writeFile(path.join(out, "stage"), stage);
    return stage;
  }

  return await promptPersonalStage(out, true);
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

function sanitizeStageName(stage: string) {
  return (
    stage
      .replace(/[^A-Za-z0-9-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^[^A-Za-z]/, "")
      .replace(/-$/, "") || "local"
  );
}

function isValidStageName(stage: string) {
  return Boolean(stage.match(/^[A-Za-z][A-Za-z0-9-]*$/));
}

export const exportedForTesting = {
  sanitizeStageName,
  isValidStageName,
};
