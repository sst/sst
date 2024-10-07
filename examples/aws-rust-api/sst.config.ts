/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-rust-function-url",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: 'us-east-1' }
      },
    };
  },
  async run() {
    const api = new sst.aws.Function("rust-api", {
      handler: "bootstrap",
      architecture: "arm64", // or x86_64
      bundle: "target/lambda/api",
      runtime: 'provided.al2023',
      url: true,
    });
    const router = new sst.aws.Router("MyRouter", {
      routes: {
        "/*": api.url,
      },
      domain: "rust.dev.sst.dev",
    });
    return {
      function: api.url,
      domain: router.url
    }
  }
});
