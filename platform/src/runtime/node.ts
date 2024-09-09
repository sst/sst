import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import esbuild, { BuildOptions, BuildResult } from "esbuild";
import pulumi from "@pulumi/pulumi";
import { findAbove } from "../util/fs.js";
import { FunctionArgs } from "../components/aws/function.js";
import fsSync from "fs";
import { Semaphore } from "../util/semaphore.js";

const limiter = new Semaphore(
  parseInt(process.env.SST_BUILD_CONCURRENCY || "4"),
);

export async function buildNode(
  name: string,
  input: pulumi.Unwrap<FunctionArgs> & {
    links?: {
      name: string;
      properties: any;
    }[];
  },
) {
  const out = path.join($cli.paths.work, "artifacts", `${name}-src`);
  const sourcemapOut = path.join($cli.paths.work, "artifacts", `${name}-map`);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  await fs.mkdir(sourcemapOut, { recursive: true });

  const parsed = path.parse(input.handler!);
  const file = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]
    .map((ext) => path.join(parsed.dir, parsed.name + ext))
    .find((file) => fsSync.existsSync(file))!;
  if (!file)
    return {
      type: "error" as const,
      errors: [`Could not find file for handler "${input.handler}"`],
    };

  const nodejs = input.nodejs || {};
  const isESM = (nodejs.format || "esm") === "esm";

  const relative = path.relative($cli.paths.root, path.resolve(parsed.dir));

  const extension = isESM ? ".mjs" : ".cjs";
  const target = path.join(
    out,
    !relative.startsWith("..") && !path.isAbsolute(input.handler!)
      ? relative
      : "",
    // Lambda handler can only contain 1 dot separating the file name and function name
    parsed.name.replace(".", "-") + extension,
  );
  const handler = path
    .relative(out, target.replace(extension, parsed.ext))
    .split(path.sep)
    .join(path.posix.sep);

  // Rebuilt using existing esbuild context
  const forceExternal = ["sharp", "pg-native"];
  const { external, ...override } = nodejs.esbuild || {};
  const links = Object.fromEntries(
    input.links?.map((item) => [item.name, item.properties]) || [],
  );
  const options: BuildOptions = {
    entryPoints: [path.resolve(file)],
    platform: "node",
    external: [
      ...forceExternal,
      ...(nodejs.install || []),
      ...(external || []),
    ],
    loader: nodejs.loader,
    keepNames: true,
    bundle: true,
    logLevel: "silent",
    splitting: nodejs.splitting,
    metafile: true,
    outExtension: nodejs.splitting ? { ".js": ".mjs" } : undefined,
    ...(isESM
      ? {
          format: "esm",
          target: "esnext",
          mainFields: ["module", "main"],
          banner: {
            js: [
              `import { createRequire as topLevelCreateRequire } from 'module';`,
              `const require = topLevelCreateRequire(import.meta.url);`,
              `import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"`,
              `const __filename = topLevelFileUrlToPath(import.meta.url)`,
              `const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
              `globalThis.$SST_LINKS = ${JSON.stringify(links)};`,
              nodejs.banner || "",
            ].join("\n"),
          },
        }
      : {
          format: "cjs",
          target: "node14",
          banner: {
            js: [
              `globalThis.$SST_LINKS = ${JSON.stringify(links)};`,
              nodejs.banner || "",
            ].join("\n"),
          },
        }),
    outfile: !nodejs.splitting ? target : undefined,
    outdir: nodejs.splitting ? path.dirname(target) : undefined,
    // always generate sourcemaps in local
    // never generate sourcemaps if explicitly false
    // otherwise generate sourcemaps
    sourcemap: nodejs.sourcemap === false ? false : true,
    minify: nodejs.minify,
    ...override,
  };
  Object.assign(options, nodejs.esbuild);
  try {
    await limiter.acquire(name);
    const result = await esbuild.build(options);

    // Install node_modules
    const installPackages = [
      ...(nodejs.install || []),
      ...forceExternal
        .filter((pkg) => !external?.includes(pkg))
        .filter((pkg) =>
          Object.values(result.metafile?.inputs || {}).some(({ imports }) =>
            imports.some(({ path }) => path === pkg),
          ),
        ),
    ];

    // TODO bubble up the warnings
    const warnings: string[] = [];
    Object.entries(result.metafile?.inputs || {}).forEach(
      ([inputPath, { imports }]) =>
        imports
          .filter(({ path }) => path.includes("sst/constructs"))
          .forEach(({ path }) => {
            warnings.push(
              `You are importing from "${path}" in "${inputPath}". Did you mean to import from "sst/node"?`,
            );
          }),
    );

    if (installPackages.length) {
      const src = await findAbove(parsed.dir, "package.json");
      if (src === undefined) {
        return {
          type: "error" as const,
          errors: [
            `Could not find package.json for handler "${input.handler}"`,
          ],
        };
      }
      const json = JSON.parse(
        await fs
          .readFile(path.join(src, "package.json"))
          .then((x) => x.toString()),
      );
      await fs.writeFile(
        path.join(out, "package.json"),
        JSON.stringify({
          dependencies: Object.fromEntries(
            installPackages.map((x) => [x, json.dependencies?.[x] || "*"]),
          ),
        }),
      );
      const cmd = [
        "npm install",
        "--force",
        "--platform=linux",
        input.architecture === "arm64" ? "--arch=arm64" : "--arch=x64",
        // support npm versions 10 and above
        "--os=linux",
        input.architecture === "arm64" ? "--cpu=arm64" : "--cpu=x64",
      ];
      if (installPackages.includes("sharp")) {
        cmd.push("--libc=glibc");
      }
      await new Promise<void>((resolve, reject) => {
        exec(cmd.join(" "), { cwd: out }, (error) => {
          if (error) {
            reject(error);
          }
          resolve();
        });
      });
    }

    const moveSourcemap = async () => {
      if (nodejs.sourcemap) return;
      const map = Object.keys(result.metafile?.outputs || {}).find((item) =>
        item.endsWith(".map"),
      );
      if (!map) return;
      const oldPath = path.resolve($cli.paths.platform, map);
      const newPath = path.join(sourcemapOut, path.basename(map));
      await fs.rename(oldPath, newPath);
      return newPath;
    };

    return {
      type: "success" as const,
      out,
      handler,
      sourcemap: await moveSourcemap(),
    };
  } catch (ex: any) {
    const result = ex as BuildResult;
    if ("errors" in result) {
      return {
        type: "error" as const,
        errors: result.errors.flatMap((x) => [x.text]).filter(Boolean),
      };
    }

    return {
      type: "error" as const,
      errors: [ex.toString()],
    };
  } finally {
    limiter.release();
  }
}
