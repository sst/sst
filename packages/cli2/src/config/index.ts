import { Context } from "@serverless-stack/node/context/index.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { GlobalCLIOptionsContext } from "../cli/sst.js";
import { VisibleError } from "../error/index.js";
import { Logger } from "../logger/index.js";
import { usePersonalStage } from "../state/index.js";

export interface Config {
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

const CONFIG_EXTENSIONS = [".config.cjs", ".config.mjs", ".config.js", ".json"];

type ConfigWithDefaults = Config &
  Required<{ [key in keyof typeof DEFAULTS]: Exclude<Config[key], undefined> }>;

export const useProjectRoot = Context.memo(async () => {
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
        Logger.debug("Found", configPath);
        return dir;
      }
    }
    return await find(path.join(dir, ".."));
  }
  const result = await find(process.cwd());
  Logger.debug("Found project root", result);
  return result;
});

export const useConfig = Context.memo(async () => {
  const root = await useProjectRoot();
  const globals = GlobalCLIOptionsContext.use();
  for (const ext of CONFIG_EXTENSIONS) {
    const file = path.join(root, "sst" + ext);
    if (file.endsWith("js")) {
      try {
        const config = await import(file);
        return {
          ...DEFAULTS,
          ...config.default,
          stage:
            config.default.stage || globals.stage || (await usePersonalStage()),
          profile: config.default.profile || globals.profile,
        } as ConfigWithDefaults;
      } catch (ex) {
        continue;
      }
    }

    if (file.endsWith(".json")) {
      try {
        const data = await fs.readFile(file);
        return Object.assign(
          DEFAULTS,
          JSON.parse(data.toString("utf8"))
        ) as ConfigWithDefaults;
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
});
