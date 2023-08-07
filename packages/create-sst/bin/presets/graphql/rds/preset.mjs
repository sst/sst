import { patch, remove, extend, extract, install } from "create-sst";
export default [
  extend("presets/graphql/basic"),
  extract(),
  install({
    packages: ["hygen"],
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/scripts/gen", value: "hygen" }],
  }),
  install({
    packages: ["tsx"],
    path: "packages/core",
    dev: true,
  }),
  install({
    packages: [
      "kysely@0.25.0",
      "kysely-data-api",
      "aws-sdk",
      "@aws-sdk/client-rds-data",
    ],
    path: "packages/core",
  }),
  patch({
    file: "./packages/core/package.json",
    operations: [
      {
        op: "add",
        path: "/scripts/migrate",
        value: "sst bind tsx ./src/migrator.ts",
      },
    ],
  }),
];
