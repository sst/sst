import { Context } from "@serverless-stack/node/context/index.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { VisibleError } from "@core/error.js";
import { Logger } from "@core/logger.js";

export interface Project {
  name: string;
  stage?: string;
  profile?: string;
  region?: string;
  main?: string;
}

const DEFAULTS = {
  main: "stacks/index.ts",
  stage: undefined,
} as const;

type ProjectWithDefaults = Project &
  Required<{
    [key in keyof typeof DEFAULTS]: Exclude<Project[key], undefined>;
  }> & {
    paths: {
      root: string;
      out: string;
    };
  };

const ProjectContext = Context.create<ProjectWithDefaults>();

export function useProject() {
  return ProjectContext.use();
}

const CONFIG_EXTENSIONS = [".config.cjs", ".config.mjs", ".config.js", ".json"];

interface GlobalOptions {
  profile?: string;
  stage?: string;
  root?: string;
}

export async function initProject(globals: GlobalOptions) {
  const root = globals.root || (await findRoot());
  Logger.debug("Using project root", root);
  const out = path.join(root, ".sst");
  await fs.mkdir(out, {
    recursive: true,
  });
  Logger.debug("Using project out", out);

  async function load() {
    for (const ext of CONFIG_EXTENSIONS) {
      const file = path.join(root, "sst" + ext);
      if (file.endsWith("js")) {
        let fn;
        try {
          fn = await import(file);
        } catch (err) {
          continue;
        }
        const config = await fn.default(globals);
        return {
          ...DEFAULTS,
          ...config,
          stage: globals.stage || (await usePersonalStage(out)),
          profile: globals.profile || config.profile,
        } as ProjectWithDefaults;
      }

      if (file.endsWith(".json")) {
        try {
          const data = await fs.readFile(file);
          return Object.assign(
            DEFAULTS,
            JSON.parse(data.toString("utf8"))
          ) as ProjectWithDefaults;
        } catch {
          continue;
        }
      }
    }
    throw new VisibleError(
      "Could not found a configuration file",
      "Make sure one of the following exists",
      "  - sst.config.cjs",
      "  - sst.config.mjs",
      "  - sst.config.js",
      "  - sst.json"
    );
  }
  const project = await load();
  project.paths = {
    root,
    out,
  };
  Logger.debug("Config loaded", project);

  ProjectContext.provide(project);
}

async function usePersonalStage(out: string) {
  try {
    const result = await fs.readFile(path.join(out, "stage"));
    return result.toString("utf8").trim();
  } catch {
    return;
  }
}

async function findRoot() {
  Logger.debug("Searching for project root...");
  async function find(dir: string): Promise<string> {
    if (dir === "/")
      throw new VisibleError(
        "Could not found a configuration file",
        "Make sure one of the following exists",
        ...CONFIG_EXTENSIONS.map((ext) => `  - sst${ext}`)
      );
    for (const ext of CONFIG_EXTENSIONS) {
      const configPath = path.join(dir, `sst${ext}`);
      Logger.debug("Searching", configPath);
      if (fsSync.existsSync(configPath)) {
        Logger.debug("Found config", configPath);
        return dir;
      }
    }
    return await find(path.join(dir, ".."));
  }
  const result = await find(process.cwd());
  return result;
}
