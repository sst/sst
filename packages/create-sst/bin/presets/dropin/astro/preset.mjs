import { patch, extend, extract, install } from "create-sst";

export default [
  extract(),
  install({
    packages: [
      "sst@rc",
      "aws-cdk-lib@2.55.0",
      "constructs@10.1.156",
      "astro-sst",
    ],
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/scripts/sst:deploy", value: "sst deploy" },
      { op: "add", path: "/scripts/sst:dev", value: "sst dev" },
      { op: "add", path: "/scripts/dev", value: "sst bind 'astro dev'" },
    ],
  }),
  patch({
    file: "tsconfig.json",
    operations: [{ op: "add", path: "/include", value: [] }],
  }),
  patch({
    file: "tsconfig.json",
    operations: [{ op: "add", path: "/include/-", value: ".sst/types" }],
  }),
];
