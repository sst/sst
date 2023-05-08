import { extract, str_replace, extend } from "create-sst";

export default [
  extend("presets/base/monorepo"),
  extract(),
  str_replace({
    file: "sst.config.ts",
    pattern: `import { SSTConfig } from "sst";`,
    replacement: [
      `import { SSTConfig } from "sst";`,
      `import { ExampleStack } from "./stacks/ExampleStack";`,
    ].join("\n"),
  }),
  str_replace({
    file: "sst.config.ts",
    pattern: `stacks(app) {},`,
    replacement: [`stacks(app) {`, `    app.stack(ExampleStack);`, `  }`].join(
      "\n"
    ),
  }),
];
