import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import esbuild, { BuildOptions, BuildResult } from "esbuild";
import pulumi from "@pulumi/pulumi";
import { existsAsync, findAbove } from "../util/fs.js";
import { HandlerFunctionArgs } from "../components/handler-function.js";

export async function build(
  name: string,
  input: pulumi.Unwrap<HandlerFunctionArgs>
) {
  // TODO * - pulumi: should `input.name` be passed in a `string` or `Input<string>`?
  // - where should `.apply` be called?
  const out = path.join(app.paths.temp, name);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });

  const parsed = path.parse(input.handler!);
  const file = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]
    .map((ext) => path.join(parsed.dir, parsed.name + ext))
    .find((file) => {
      return existsAsync(file);
    })!;
  if (!file)
    return {
      type: "error" as const,
      errors: [`Could not find file for handler "${input.handler}"`],
    };

  const nodejs = input.nodejs || {};
  const isESM = (nodejs.format || "esm") === "esm";

  const relative = path.relative(app.paths.root, path.resolve(parsed.dir));

  const extension = isESM ? ".mjs" : ".cjs";
  const target = path.join(
    out,
    !relative.startsWith("..") && !path.isAbsolute(input.handler!)
      ? relative
      : "",
    parsed.name + extension
  );
  const handler = path
    .relative(out, target.replace(extension, parsed.ext))
    .split(path.sep)
    .join(path.posix.sep);

  // Rebuilt using existing esbuild context
  const forceExternal = [
    "sharp",
    "pg-native",
    ...(isESM || input.runtime !== "nodejs16.x" ? [] : ["aws-sdk"]),
  ];
  const { external, ...override } = nodejs.esbuild || {};
  const options: BuildOptions = {
    entryPoints: [file],
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
              `const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
              nodejs.banner || "",
            ].join("\n"),
          },
        }
      : {
          format: "cjs",
          target: "node14",
          banner: nodejs.banner
            ? {
                js: nodejs.banner,
              }
            : undefined,
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
  const ctx = await esbuild.context(options);

  try {
    const result = await ctx.rebuild();

    // Install node_modules
    const installPackages = [
      ...(nodejs.install || []),
      ...forceExternal
        .filter((pkg) => pkg !== "aws-sdk")
        .filter((pkg) => !external?.includes(pkg))
        .filter((pkg) =>
          Object.values(result.metafile?.inputs || {}).some(({ imports }) =>
            imports.some(({ path }) => path === pkg)
          )
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
              `You are importing from "${path}" in "${inputPath}". Did you mean to import from "sst/node"?`
            );
          })
    );

    if (installPackages) {
      const src = await findAbove(parsed.dir, "package.json");
      if (!src) {
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
          .then((x) => x.toString())
      );
      await fs.writeFile(
        path.join(out, "package.json"),
        JSON.stringify({
          dependencies: Object.fromEntries(
            installPackages.map((x) => [x, json.dependencies?.[x] || "*"])
          ),
        })
      );
      const cmd = ["npm install"];
      if (installPackages.includes("sharp")) {
        cmd.push(
          "--platform=linux",
          input.architectures?.includes("arm_64")
            ? "--arch=arm64"
            : "--arch=x64"
        );
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

    ctx.dispose();

    return {
      type: "success" as const,
      out,
      handler,
      sourcemap: !nodejs.sourcemap
        ? Object.keys(result.metafile?.outputs || {}).find((item) =>
            item.endsWith(".map")
          )
        : undefined,
    };
  } catch (ex: any) {
    const result = ex as BuildResult;
    if ("errors" in result) {
      return {
        type: "error" as const,
        errors: result.errors.flatMap((x) => [
          console.log(x.text),
          x.location?.file || "",
          console.log(x.location?.line, "│", x.location?.lineText),
        ]),
      };
    }

    return {
      type: "error" as const,
      errors: [ex.toString()],
    };
  }
}
