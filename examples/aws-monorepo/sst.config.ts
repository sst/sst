/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS Monorepo
 *
 * A light setup for a more complex project - splits the config into multiple files and uses a monorepo setup.
 */
export default $config({
  app(input) {
    return {
      name: "aws-monorepo",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  run() {
    return import("./infra/index.js");
  },
});
