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
    api
      .route("GET /", {
        handler: "route.handler",
      })
      .route("GET /foo", "route.handler", { auth: { iam: true } })
      .route("GET /bar", "route.handler", {
        auth: {
          jwt: {
            issuer:
              "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Rq4d8zILG",
            audiences: ["user@example.com"],
          },
        },
      })
      .route("$default", "route.handler");

    return {
      api: api.url,
    };
  },
});
