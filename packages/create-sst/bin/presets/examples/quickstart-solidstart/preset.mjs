import { patch, extend, extract, install, cmd, str_replace } from "create-sst";
export default [
  extract(),
  install({
    packages: [
      "@types/node",
      "aws-cdk-lib@2.79.1",
      "constructs@10.1.156",
      "esbuild",
      "postcss",
      "solid-start-node",
      "solid-start-sst",
      "sst",
      "typescript",
      "vite",
    ],
    dev: true,
  }),
  install({
    packages: [
      "@aws-sdk/client-s3",
      "@aws-sdk/s3-request-presigner",
      "@solidjs/meta",
      "@solidjs/router",
      "solid-js",
      "solid-start",
      "undici",
    ],
  }),
];
