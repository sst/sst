import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { Packager } from "../packager/index.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export * as Update from "./index.js";

type RunOpts = {
  rootDir: string;
  verbose: boolean;
  version?: string;
};

export function run(opts: RunOpts) {
  // Update SST dependencies
  const manager = Packager.getManager(opts.rootDir);
  const json = JSON.parse(
    fs.readFileSync(path.join(opts.rootDir, "package.json")).toString()
  );
  const version = opts.version || "latest";
  for (const pkg of [
    "@serverless-stack/cli",
    "@serverless-stack/resources",
  ] as const) {
    if (!opts.verbose) console.log(chalk.gray("Updating", pkg, "to", version));
    manager.add({
      cwd: opts.rootDir,
      type: json.dependencies?.[pkg] ? "dependencies" : "devDependencies",
      pkgs: [`${pkg}@${version}`],
      verbose: opts.verbose,
    });
  }

  // Check CDK v1 dependencies
  const cdkV1deps: string[] = [];
  for (const type of ["dependencies", "devDependencies"] as const) {
    Object.keys(json[type] || {})
      .filter(isCdkV1Dep)
      .forEach((key) => cdkV1deps.push(key));
  }
  if (cdkV1deps.length) {
    console.log(
      `\n${chalk.red("❌")} Update the following AWS CDK packages to v2:\n`
    );
    cdkV1deps.forEach((dep) => console.log(`  - ${dep}`));
    console.log("");
    console.log(
      `More details on upgrading to CDK v2: https://github.com/serverless-stack/sst/releases/tag/v0.59.0`
    );
    throw new Error(`Failed to update the app`);
  }

  // Update CDK dependencies
  const module = require.resolve("@serverless-stack/core");
  const compare = fs.readJsonSync(path.join(module, "../../", "package.json"));
  const cdkVersion = compare.dependencies["aws-cdk"];

  for (const type of ["dependencies", "devDependencies"] as const) {
    const updates = Object.keys(json[type] || {})
      .filter((key) => isCdkV2CoreDep(key) || isCdkV2AlphaDep(key))
      .map((key) =>
        isCdkV2CoreDep(key)
          ? `${key}@${cdkVersion}`
          : `${key}@${cdkVersion}-alpha.0`
      );
    if (!updates.length) continue;
    if (!opts.verbose)
      updates.forEach((pkg) => console.log(chalk.gray("Updating", pkg)));
    manager.add({
      type,
      cwd: opts.rootDir,
      pkgs: updates,
      verbose: opts.verbose,
    });
  }

  console.log(`SST: ${compare.version}\nCDK: ${cdkVersion}`);
}

function isCdkV2CoreDep(dep: string) {
  return dep === "aws-cdk" || dep === "aws-cdk-lib";
}

function isCdkV2AlphaDep(dep: string) {
  return dep.startsWith("@aws-cdk/") && dep.endsWith("-alpha");
}

function isCdkV1Dep(dep: string) {
  return dep.startsWith("@aws-cdk/") && !dep.endsWith("-alpha");
}
