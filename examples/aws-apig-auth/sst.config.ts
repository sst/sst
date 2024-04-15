/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## API Gateway auth
 *
 * Enable IAM and JWT authorizers for API Gateway routes.
 *
 */
export default $config({
  app(input) {
    return {
      name: "aws-apig-auth",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayV2("MyApi", {
      domain: {
        name: "api.ion.sst.sh",
        path: "v1",
      },
    });
    api.route("GET /", {
      handler: "route.handler",
    });
    api.route("GET /foo", "route.handler", { auth: { iam: true } });
    api.route("GET /bar", "route.handler", {
      auth: {
        jwt: {
          issuer:
            "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Rq4d8zILG",
          audiences: ["user@example.com"],
        },
      },
    });
    api.route("$default", "route.handler");

    return {
      api: api.url,
    };
  },
});
