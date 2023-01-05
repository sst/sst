import { remove, cmd, patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/minimal/typescript"),
  remove("stacks/MyStack.ts"),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/overrides", value: {} },
      { op: "add", path: "/overrides/graphql", value: "16.5.0" },
    ],
  }),
  // Vanilla Extract doesn't support Vite 3 yet
  // https://github.com/seek-oss/vanilla-extract/issues/760
  cmd({ cmd: "npx create-vite@2.9.5 web --template=react-ts" }),
  extract(),
  install({
    packages: ["@pothos/core", "graphql", "ulid"],
    path: "services",
  }),
  install({
    packages: ["react-router-dom", "urql", "graphql"],
    path: "web",
  }),
  install({
    packages: ["sst"],
    path: "web",
    dev: true,
  }),
  patch({
    file: "web/package.json",
    operations: [{ op: "add", path: "/scripts/dev", value: "sst env vite" }],
  }),
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
  cmd({
    cmd: "npx @genql/cli --output ./graphql/genql --schema ./graphql/schema.graphql --esm",
  }),
  install({
    packages: [
      "@vanilla-extract/css",
      "@vanilla-extract/vite-plugin",
      "react-icons",
    ],
    path: "web",
  }),
  remove("web/src/App.tsx"),
  remove("web/src/App.css"),
  remove("web/src/logo.svg"),
  remove("web/src/index.css"),
  remove("web/src/favicon.svg"),
  remove("web/public/vite.svg"),
  remove("web/src/assets/react.svg"),
];
