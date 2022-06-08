import { Config } from "../config";
import * as esbuild from "esbuild";
import fs from "fs-extra";
import { State } from "../state/index.js";
import path from "path";
import ts from "typescript";
import type { Diagnostic } from "typescript";
const { createProgram, getLineAndCharacterOfPosition, getPreEmitDiagnostics } =
  ts;
import chalk from "chalk";

export async function build(root: string, config: Config) {
  const buildDir = State.stacksPath(root);
  const pkg = await fs.readJson(path.join(root, "package.json"));
  const entry = path.relative(process.cwd(), path.join(root, config.main))
  if (!fs.existsSync(entry))
    throw new Error(
      `Cannot find app handler. Make sure to add a "${config.main}" file`
    );

  await esbuild.build({
    keepNames: true,
    bundle: true,
    sourcemap: true,
    platform: "node",
    target: "esnext",
    format: "esm",
    external: [
      "aws-cdk-lib",
      "@serverless-stack/*",
      ...Object.keys({
        ...pkg.devDependencies,
        ...pkg.dependencies,
        ...pkg.peerDependencies,
      }),
    ],
    banner: {
      js: [
        `import { createRequire as topLevelCreateRequire } from 'module'`,
        `const require = topLevelCreateRequire(import.meta.url)`,
      ].join("\n"),
    },
    // The entry can have any file name (ie. "stacks/anything.ts"). We want the
    // build output to be always named "lib/index.js". This allow us to always
    // import from "buildDir" without needing to pass "anything" around.
    outfile: `${buildDir}/index.js`,
    entryPoints: [entry],
  });
}

// This is used to typecheck JS code to provide helpful errors even if the user isn't using typescript
export function check(root: string, config: Config) {
  const entry = path.join(root, config.main);
  const program = createProgram({
    rootNames: [entry],
    options: {
      lib: ["lib.es2021.d.ts"],
      incremental: true,
      tsBuildInfoFile: path.join(root, ".sst", "tsbuildinfo"),
      skipLibCheck: true,
      allowJs: true,
      checkJs: true,
      noEmit: true,
      strict: true,
      strictNullChecks: false,
      noImplicitAny: false,
    },
  });
  const result = program.emit();
  return getPreEmitDiagnostics(program).concat(result.diagnostics);
}

export function formatDiagnostics(list: Diagnostic[]) {
  function bottom(msg: Diagnostic["messageText"]): string {
    if (typeof msg === "string") return msg;
    if (msg.next?.[0]) return bottom(msg.next?.[0]);
    return msg.messageText;
  }
  return list.map((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      );
      const message = bottom(diagnostic.messageText);
      return [
        `${diagnostic.file.fileName} (${line + 1},${
          character + 1
        }): ${message}`,
        `${line - 1}. ${diagnostic.file.text.split("\n")[line - 1]}`,
        chalk.yellow(`${line}. ${diagnostic.file.text.split("\n")[line]}`),
        `${line + 1}. ${diagnostic.file.text.split("\n")[line + 1]}`,
      ].join("\n");
    } else {
      return bottom(diagnostic.messageText);
    }
  });
}
