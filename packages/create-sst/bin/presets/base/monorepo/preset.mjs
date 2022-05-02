import { extract, patch, install } from "create-sst";

export default [
  extract(),
  patch({
    file: "package.json",
    operations: [
      {
        op: "add",
        path: "/workspaces",
        value: ["backend"],
      },
    ],
  }),
  install({
    packages: ["aws-sdk"],
    path: "backend",
  }),
  install({
    packages: ["@types/aws-lambda"],
    path: "backend",
    dev: true,
  }),
];
