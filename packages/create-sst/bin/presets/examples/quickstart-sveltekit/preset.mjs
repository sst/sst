import { patch, extend, extract, install, cmd, str_replace } from "create-sst";
export default [
  extract(),
  install({
    packages: [
      "@aws-sdk/client-s3",
      "@aws-sdk/s3-request-presigner",
      "@fontsource/fira-mono",
      "@neoconfetti/svelte",
      "@sveltejs/adapter-auto",
      "@sveltejs/kit",
      "@types/cookie",
      "aws-cdk-lib@2.79.1",
      "constructs@10.1.156",
      "sst",
      "svelte",
      "svelte-check",
      "svelte-kit-sst",
      "tslib",
      "typescript",
      "vite",
    ],
    dev: true,
  }),
];
