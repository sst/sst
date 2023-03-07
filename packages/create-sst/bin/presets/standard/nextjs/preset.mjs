import { patch, extend, extract, cmd, str_replace } from "create-sst";
export default [
  extend("presets/base/monorepo"),
  cmd({
    cmd: "npx create-next-app@latest next --ts --no-eslint --no-src-dir --experimental-app --import-alias '@/*' --use-pnpm",
    cwd: "packages",
  }),
  patch({
    file: "packages/next/tsconfig.json",
    operations: [
      {
        op: "add",
        path: "/compilerOptions/paths/@@@app~1core~1*",
        value: ["../core/src/*"],
      },
    ],
  }),
  extract(),
  str_replace({
    file: "sst.config.ts",
    pattern: `import { SSTConfig } from "sst";`,
    replacement: [
      `import { SSTConfig } from "sst";`,
      `import { Default } from "./stacks/Default";`,
    ].join("\n"),
  }),
  str_replace({
    file: "sst.config.ts",
    pattern: `stacks(app) {},`,
    replacement: [`stacks(app) {`, `    app.stack(Default);`, `  }`].join("\n"),
  }),
];
