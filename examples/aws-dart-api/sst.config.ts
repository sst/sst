/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-dart-api",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayV2("MyApi");
    api.route("GET /", {
      runtime: "provided.al2023",
      architecture: process.arch === "arm64" ? "arm64" : "x86_64",
      bundle: build(),
      handler: "hello",
    });
  },
});

function build() {
  require("child_process").execSync(`
mkdir -p .build
docker run -v $PWD:/app -w /app --entrypoint ./build.sh dart:stable-sdk
`);
  return `.build/`;
}
