import { patch, append, extract, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst", "aws-cdk-lib@2.110.1", "constructs@10.3.0", "astro-sst"],
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/scripts/sst:deploy", value: "sst deploy" },
      { op: "add", path: "/scripts/sst:dev", value: "sst dev" },
      { op: "add", path: "/scripts/dev", value: "sst bind astro dev" },
    ],
  }),
  append({
    file: ".gitignore",
    string: ["", "", "# sst", ".sst"].join("\n"),
  }),
];
