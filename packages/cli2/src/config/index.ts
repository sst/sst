import { Context } from "@serverless-stack/node/context/index.js";
import fs from "fs/promises";
import path from "path";
import { GlobalCLIOptionsContext } from "../cli.js";
import { VisibleError } from "../error/index.js";
import { PersonalStageContext } from "../state/index.js";

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

type ConfigWithDefaults = Config &
  Required<{ [key in keyof typeof DEFAULTS]: Exclude<Config[key], undefined> }>;

export const ProjectRoot = Context.create(() => process.cwd());

export const useConfig = Context.memo(async () => {
  const root = ProjectRoot.use();
  const extensions = [".config.cjs", ".config.mjs", ".config.js", ".json"];
  const globals = GlobalCLIOptionsContext.use();
  for (const ext of extensions) {
    const file = path.join(root, "sst" + ext);
    if (file.endsWith("js")) {
      try {
        const config = await import(file);
        return {
          ...DEFAULTS,
          ...config.default,
          stage:
            config.default.stage ||
            globals.stage ||
            (await PersonalStageContext.use()),
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
