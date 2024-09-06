/// <reference path="./.sst/platform/config.d.ts" />

const swiftVersion = "5.10";

/**
 * ## Swift in Lambda
 *
 * Deploys a simple Swift application to Lambda using the `al2023` runtime.
 *
 * :::note
 * Building this function requires Docker.
 * :::
 *
 * Check out the README in the repo for more details.
 */
export default $config({
  app(input) {
    return {
      name: "aws-swift",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const swift = new sst.aws.Function("Swift", {
      runtime: "provided.al2023",
      architecture: process.arch === "arm64" ? "arm64" : "x86_64",
      bundle: build("app"),
      handler: "bootstrap",
      url: true,
    });
    const router = new sst.aws.Router("SwiftRouter", {
      routes: {
        "/*": swift.url,
      },
      domain: "swift.dev.sst.dev",
    });
    return {
      url: router.url,
    };
  },
});

function build(target: string) {
  require("child_process").execSync(`
    swift package --disable-sandbox archive --products ${target} --swift-version ${swiftVersion}
    mkdir -p .build/lambda/${target}
    cp .build/release/${target} .build/lambda/${target}/bootstrap
  `);
  return `.build/lambda/${target}`;
}
