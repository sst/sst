import { extend, extract, str_replace } from "create-sst";
export default [
  extend("presets/base/monorepo"),
  extract(),
  str_replace({
    file: "sst.config.ts",
    pattern: `import { SSTConfig } from "sst";`,
    replacement: [
      `import { SSTConfig } from "sst";`,
      `import { API } from "./stacks/MyStack";`,
    ].join("\n"),
  }),
  str_replace({
    file: "sst.config.ts",
    pattern: `stacks(app) {},`,
    replacement: [`stacks(app) {`, `    app.stack(API);`, `  }`].join("\n"),
  }),
];
