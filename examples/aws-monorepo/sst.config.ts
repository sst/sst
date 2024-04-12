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
  async run() {
    await import("./infra/index.js");
  },
});
