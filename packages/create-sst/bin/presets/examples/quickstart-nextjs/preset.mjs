import { patch, extend, extract, install, cmd, str_replace } from "create-sst";
export default [
  extract(),
  install({
    packages: ["sst", "aws-cdk-lib@2.91.0", "constructs@10.2.69"],
    dev: true,
  }),
  install({
    packages: [
      "@aws-sdk/client-s3",
      "@aws-sdk/s3-request-presigner",
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "next",
      "react",
      "react-dom",
      "typescript",
    ],
  }),
];
