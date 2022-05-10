import { remove, cmd, patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/base/starter"),
  extend("presets/base/monorepo"),
  patch({
    file: "sst.json",
    operations: [{ op: "add", path: "/main", value: "stacks/index.ts" }],
  }),
  cmd({ cmd: "npm init vite -- web --template=react-ts" }),
  extract(),
  install({
    packages: [
      "@pothos/core",
      "@serverless-stack/node",
      "graphql",
      "kysely",
      "kysely-data-api",
    ],
    path: "backend",
  }),
  install({
    packages: [
      "acorn",
      "acorn-walk",
      "esbuild",
      "graphql",
      "escodegen",
      "graphql-zeus",
      "@pothos/core",
    ],
    dev: true,
    path: "graphql",
  }),
  install({
    packages: [
      "react-router-dom",
      "react-query",
      "urql",
      "graphql",
      "@serverless-stack/web",
    ],
    path: "web",
  }),
  remove("web/src/App.tsx"),
  remove("web/src/App.css"),
  remove("web/src/logo.svg"),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/workspaces/-", value: "graphql" },
      { op: "add", path: "/workspaces/-", value: "web" },
    ],
  }),
];
