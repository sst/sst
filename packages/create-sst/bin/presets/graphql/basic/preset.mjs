import {
  remove,
  cmd,
  patch,
  extend,
  extract,
  install,
  str_replace,
} from "create-sst";
export default [
  extend("presets/base/monorepo"),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/overrides", value: {} },
      { op: "add", path: "/overrides/graphql", value: "16.5.0" },
    ],
  }),
  // Vanilla Extract doesn't support Vite 3 yet
  // https://github.com/seek-oss/vanilla-extract/issues/760
  cmd({
    cmd: "npx create-vite@2.9.5 web --template=react-ts",
    cwd: "packages",
  }),
  extract(),
  str_replace({
    file: "sst.config.ts",
    pattern: `import { SSTConfig } from "sst";`,
    replacement: [
      `import { SSTConfig } from "sst";`,
      `import { Api } from "./stacks/Api";`,
      `import { Web } from "./stacks/Web";`,
      `import { Database } from "./stacks/Database";`,
    ].join("\n"),
  }),
  str_replace({
    file: "sst.config.ts",
    pattern: `stacks(app) {},`,
    replacement: [
      `stacks(app) {`,
      `    app`,
      `      .stack(Database)`,
      `      .stack(Api)`,
      `      .stack(Web);`,
      `  }`,
    ].join("\n"),
  }),
  install({
    packages: ["ulid"],
    path: "packages/core",
  }),
  install({
    packages: ["@pothos/core", "graphql", "ulid"],
    path: "packages/functions",
  }),
  install({
    packages: ["@types/aws-lambda"],
    path: "packages/functions",
  }),
  install({
    packages: ["react-router-dom", "urql", "graphql"],
    path: "packages/web",
  }),
  install({
    packages: ["sst"],
    path: "packages/web",
    dev: true,
  }),
  patch({
    file: "packages/web/package.json",
    operations: [{ op: "add", path: "/scripts/dev", value: "sst bind vite" }],
  }),
  patch({
    file: "packages/web/package.json",
    operations: [
      {
        op: "add",
        path: "/dependencies/@@@app~1graphql",
        value: "0.0.0",
      },
    ],
  }),
  install({
    packages: ["wonka", "@genql/runtime@2.x", "urql", "graphql", "react"],
    path: "packages/graphql",
  }),
  install({
    packages: ["@genql/cli@2.x", "@types/react"],
    dev: true,
    path: "packages/graphql",
  }),
  cmd({
    cmd: "npx @genql/cli --output ./genql --schema ./schema.graphql --esm",
    cwd: "packages/graphql",
  }),
  install({
    packages: ["react-icons"],
    path: "packages/web",
  }),
  remove("packages/web/src/App.tsx"),
  remove("packages/web/src/App.css"),
  remove("packages/web/src/logo.svg"),
  remove("packages/web/src/index.css"),
  remove("packages/web/src/favicon.svg"),
  remove("packages/web/public/vite.svg"),
  remove("packages/web/src/assets/react.svg"),
];
