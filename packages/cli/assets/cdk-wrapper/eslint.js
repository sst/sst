#!/usr/bin/env node

"use strict";

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const { ESLint } = require("eslint");

const baseConfig = {
  root: true,
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              node: "10",
            },
          },
        ],
      ],
      plugins: ["@babel/plugin-proposal-class-properties"],
    },
  },
  plugins: ["@babel"],
  extends: "eslint:recommended",
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      plugins: ["@typescript-eslint"],
      parser: "@typescript-eslint/parser",
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    },
  ],
};

const inputFiles = process.argv.slice(3);

(async function main() {
  // 1. Create an instance with the `fix` option.
  const eslint = new ESLint({
    fix: true,
    baseConfig,
    globInputPaths: false,
    // Handling nested ESLint projects in Yarn Workspaces
    // https://github.com/serverless-stack/serverless-stack/issues/11
    resolvePluginsRelativeTo: ".",
    errorOnUnmatchedPattern: false,
  });

  // 2. Lint files. This doesn't modify target files.
  const results = await eslint.lintFiles(inputFiles);

  // 3. Modify the files with the fixed code.
  await ESLint.outputFixes(results);

  // 4. Format the results.
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  // 5. Output it.
  if (resultText) {
    console.log(resultText);
  }

  // If there is an error then exit with the status code
  results.forEach((result) => {
    if (result.errorCount > 0) {
      process.exit(1);
    }
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
