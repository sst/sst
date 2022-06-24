import { extract, patch, install } from "create-sst";

export default [
  extract(),
  patch({
    file: "package.json",
    operations: [
      {
        op: "add",
        path: "/workspaces",
        value: ["services"],
      },
    ],
  }),
  install({
    packages: ["aws-sdk"],
    path: "services",
  }),
  install({
    packages: ["@types/aws-lambda"],
    path: "services",
    dev: true,
  }),
];
