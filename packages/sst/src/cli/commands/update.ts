import type { Program } from "../program.js";

const FIELDS = ["dependencies", "devDependencies"];
const SST_PKGS = ["sst", "astro-sst", "svelte-kit-sst", "solid-start-sst"];
type Packages = Set<[string, string]>;

export const update = (program: Program) =>
  program.command(
    "update [version]",
    "Update your SST and CDK packages",
    (yargs) =>
      yargs.positional("version", {
        type: "string",
        describe: "Optionally specify a version to update to",
      }),
    async (args) => {
      const fs = await import("fs/promises");
      const path = await import("path");
      const { fetch } = await import("undici");
      const { exit, exitWithError } = await import("../program.js");
      const { useProject } = await import("../../project.js");
      const { VisibleError } = await import("../../error.js");
      const { Colors } = await import("../colors.js");

      try {
        const project = useProject();
        const files = await findAllPackageJson(project.paths.root);
        const metadata = await fetch(
          `https://registry.npmjs.org/sst/${args.version || "latest"}`
        ).then((resp) => resp.json() as any);
        const allChanges = new Map<string, Packages>();
        const allOldPackages = new Map<string, Packages>();

        // Update all package.json files
        await Promise.all(files.map(updatePackageJson));

        // Print status
        if (allOldPackages.size > 0) {
          for (const [file, pkgs] of allOldPackages.entries()) {
            Colors.line(
              Colors.danger(`✖ `),
              Colors.bold.dim(path.relative(project.paths.root, file))
            );
            for (const [pkg, version] of pkgs) {
              Colors.line(Colors.dim(`   ${pkg}@${version}`));
            }
          }
          Colors.gap();
          throw new VisibleError(
            "We've detected AWS CDK v1 dependencies in your package.json. SST requires CDK v2. Please update to CDK v2 dependencies, and then execute `sst update`. Refer to the official AWS CDK migration documentation — https://docs.aws.amazon.com/cdk/v2/guide/migrating-v2.html#migrating-v2-v1-upgrade"
          );
        }

        // Print status
        if (allChanges.size === 0) {
          Colors.line(
            Colors.success(`✔ `),
            `Already using v${metadata.version}`
          );
          return;
        }

        for (const [file, pkgs] of allChanges.entries()) {
          Colors.line(
            Colors.success(`✔ `),
            Colors.bold.dim(path.relative(project.paths.root, file))
          );
          for (const [pkg, version] of pkgs) {
            Colors.line(Colors.dim(`   ${pkg}@${version}`));
          }
        }

        Colors.gap();
        Colors.line(
          `${Colors.primary(`➜`)}  ${Colors.warning(
            "Make sure to run: npm install (or pnpm install, or yarn)"
          )}`
        );

        /////////////
        // Helpers
        /////////////

        async function findAllPackageJson(dir: string): Promise<string[]> {
          const children = await fs.readdir(dir);

          const tasks = children.map(async (item) => {
            if (item === "node_modules") return [];
            // Ignore hidden paths
            if (/(^|\/)\.[^\/\.]/g.test(item)) return [];

            const full = path.join(dir, item);
            if (item === "package.json") return [full];

            const stat = await fs.stat(full);
            if (stat.isDirectory()) return findAllPackageJson(full);
            return [];
          });

          return (await Promise.all(tasks)).flat();
        }

        async function updatePackageJson(file: string) {
          const changes: Packages = new Set();
          const oldPackages: Packages = new Set();

          const data = await fs.readFile(file).then((x) => x.toString());
          const json = JSON.parse(data);

          // Update versions
          for (const field of FIELDS) {
            const deps = json[field];
            for (const [pkg, existing] of Object.entries(deps || {})) {
              const desired = (() => {
                if (SST_PKGS.includes(pkg)) {
                  return metadata.version;
                } else if (pkg === "constructs") {
                  return metadata.dependencies.constructs;
                } else if (pkg === "aws-cdk-lib") {
                  return metadata.dependencies["aws-cdk-lib"];
                } else if (pkg.startsWith("@aws-cdk/aws-")) {
                  if (!pkg.endsWith("-alpha")) {
                    oldPackages.add([pkg, existing as string]);
                    return;
                  }
                  return metadata.dependencies[
                    "@aws-cdk/aws-apigatewayv2-alpha"
                  ];
                }
              })();
              if (!desired || existing === desired) continue;
              changes.add([pkg, desired]);
              deps[pkg] = desired;
            }
          }

          // Write to package.json
          if (changes.size > 0) {
            // note: preserve ending new line characters in package.json
            const tailingNewline = data.match(/\r?\n$/)?.[0];
            await fs.writeFile(
              file,
              `${JSON.stringify(json, null, 2)}${tailingNewline ?? ""}`
            );
            allChanges.set(file, changes);
          }

          if (oldPackages.size > 0) {
            allOldPackages.set(file, oldPackages);
          }
        }
        await exit();
      } catch (e: any) {
        await exitWithError(e);
      }
    }
  );
