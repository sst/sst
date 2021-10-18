#!/usr/bin/env node

"use strict";

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const { ESLint } = require("eslint");

const inputFiles = process.argv.slice(3);

(async function main() {
  // 1. Create an instance with the `fix` option.
  const eslint = new ESLint({
    fix: true,
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
  if (error.messageTemplate === "no-config-found") {
    console.error(
      `
      No eslint config found. There was a change starting in SST v0.48.0 with the eslint integration for better editor support. Please add the following to your package.json:

"eslintConfig": {
  "extends": ["serverless-stack"]
}

For more information check the documentation: https://docs.serverless-stack.com/working-locally#linting--type-checking
      `.trim()
    );
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
