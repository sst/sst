import { remove, cmd, patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/base/starter"),
  extend("presets/base/monorepo"),
  patch({
    file: "sst.json",
    operations: [{ op: "add", path: "/main", value: "stacks/index.ts" }],
  }),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/overrides", value: {} },
      { op: "add", path: "/overrides/graphql", value: "16.5.0" },
    ],
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
      "ulid",
    ],
    path: "api",
  }),
  install({
    packages: ["react-router-dom", "urql", "graphql"],
    path: "web",
  }),
  install({
    packages: ["@serverless-stack/static-site-env"],
    path: "web",
    dev: true,
  }),
  patch({
    file: "web/package.json",
    operations: [{ op: "add", path: "/scripts/dev", value: "sst-env -- vite" }],
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
  install({
    packages: ["@genql/cli"],
    path: "graphql",
  }),
];
