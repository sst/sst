import { Config } from "../config";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import { State } from "..";
import path from "path";

export async function build(root: string, config: Config) {
  const buildDir = State.stacksPath(root);
  const pkg = await fs.readJson(path.join(root, "package.json"));
  console.log("Main", process.cwd(), config.main);
  if (!fs.existsSync(config.main))
    throw new Error(
      `Cannot find app handler. Make sure to add a "${config.main}" file`
    );

  await esbuild.build({
    external: Object.keys({
      ...pkg.devDependencies,
      ...pkg.dependencies,
      ...pkg.peerDependencies,
    }),
    bundle: true,
    format: "cjs",
    sourcemap: true,
    platform: "node",
    target: "node14",
    outdir: buildDir,
    entryPoints: [path.join(root, config.main)],
  });
}

function ensureCDKVersionMatch(root: string) {}
