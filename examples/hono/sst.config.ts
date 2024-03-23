/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hono",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const hono = new sst.aws.Function("Hono", {
      streaming: true,
      handler: "src/index.handler",
      url: true,
    });
    const router = new sst.aws.Router("HonoRouter", {
      routes: {
        "/*": hono.url,
      },
    });
    return {
      url: router.url,
    };
  },
});
