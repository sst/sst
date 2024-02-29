import { patch, extend, extract, install, cmd, str_replace } from "create-sst";

export default [
  extend("presets/base/monorepo"),
  extract(),
  install({
    packages: ["@types/node", "@types/aws-lambda", "vitest", "sst"],
    path: "packages/functions",
    dev: true,
  }),
  install({
    packages: [
      "@aws-sdk/client-rds-data",
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "next",
      "react",
      "react-dom",
      "postcss",
      "tailwindcss",
      "autoprefixer",
      "drizzle-kit",
      "drizzle-orm",
      "typescript",
      "tsx",
    ],
    path: "packages/web",
    dev: true,
  }),
];
