import fs from "fs/promises";
import path from "path";
import { Program } from "../program.js";

const SST_PACKAGES = [
  "@serverless-stack/resources",
  "@serverless-stack/cli",
  "@serverless-stack/cli2",
  "@serverless-stack/node",
  "@serverless-stack/static-site-env",
];

const FIELDS = ["dependencies", "devDependencies"];

export const update = (program: Program) =>
  program.command(
    "update [ver]",
    "Update SST and CDK packages to another version",
    (yargs) =>
      yargs.positional("ver", {
        type: "string",
        describe: "Optional SST version to update to",
      }),
    async (args) => {
      const { fetch } = await import("undici");
      const { Logger } = await import("../../logger.js");
      const { useProject } = await import("../../app");

      const project = useProject();
      const files = await find(project.paths.root);
      const version =
        args.version ||
        (await fetch(`https://registry.npmjs.org/@serverless-stack/core/latest`)
          .then((resp) => resp.json())
          .then((resp: any) => resp.version));

      const results = new Map<string, Set<string>>();
      const tasks = files.map(async (file) => {
        const data = await fs
          .readFile(file)
          .then((x) => x.toString())
          .then(JSON.parse);

        for (const field of FIELDS) {
          const deps = data[field];
          if (!deps) continue;
          for (const [pkg, existing] of Object.entries(deps)) {
            if (!SST_PACKAGES.includes(pkg) || existing === version) continue;
            let arr = results.get(file);
            if (!arr) {
              arr = new Set();
              results.set(file, arr);
            }
            arr.add(pkg);
            deps[pkg] = version;
          }
        }

        await fs.writeFile(file, JSON.stringify(data, null, 2));
      });
      await Promise.all(tasks);

      if (results.size === 0) {
        Logger.ui("green", `All packages already match version ${version}`);
        return;
      }

      for (const [file, pkgs] of results.entries()) {
        Logger.ui("green", `✅ ${path.relative(project.paths.root, file)}`);
        for (const pkg of pkgs) {
          Logger.ui("green", `     ${pkg}@${version}`);
        }
      }

      Logger.ui(
        "yellow",
        "",
        "Don't forget to run your package manager to install the packages"
      );
    }
  );

async function find(dir: string): Promise<string[]> {
  const children = await fs.readdir(dir);

  const tasks = children.map(async (item) => {
    if (item === "node_modules") return [];
    // Ignore hidden paths
    if (/(^|\/)\.[^\/\.]/g.test(item)) return [];

    const full = path.join(dir, item);
    if (item === "package.json") return [full];

    const stat = await fs.stat(full);
    if (stat.isDirectory()) return find(full);
    return [];
  });

  return (await Promise.all(tasks)).flat();
}
