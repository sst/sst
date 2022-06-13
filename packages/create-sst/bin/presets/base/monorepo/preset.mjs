import { extract, patch, install } from "create-sst";

export default [
  extract(),
  patch({
    file: "package.json",
    operations: [
      {
        op: "add",
        path: "/workspaces",
        value: ["api"],
      },
    ],
  }),
  install({
    packages: ["aws-sdk"],
    path: "api",
  }),
  install({
    packages: ["@types/aws-lambda"],
    path: "api",
    dev: true,
  }),
];
