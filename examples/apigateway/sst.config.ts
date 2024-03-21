/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "apigateway",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayV2("MyApi", {
      domain: {
        domainName: "api.ion.sst.sh",
        path: "v1",
      },
    });
    const bucket = new sst.aws.Bucket("MyBucket");
    api
      .route("GET /", {
        handler: "route.handler",
      })
      .route("GET /foo", "route.handler", { auth: { iam: true } })
      .route("$default", "route.handler");

    return {
      api: api.url,
    };
  },
});
