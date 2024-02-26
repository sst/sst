/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "apigateway",
      providers: {
        aws: {},
      },
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayHttpApi("MyApi", {
      domain: {
        domainName: "api.ion.sst.sh",
        path: "v1",
      },
    });
    api
      .route("GET /", "route.handler")
      .route("GET /foo", "route.handler", { auth: { iam: true } })
      .route("$default", "route.handler");

    return {
      api: api.url,
    };
  },
});
