/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-apigv1",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayV1("MyApi");
    const authorizer = api.addAuthorizer({
      name: "MyAuthorizer",
      tokenFunction: "index.authorizer",
    });
    api.route("GET /", "index.handler");
    api.route("GET /iam", "index.handler", {
      auth: { iam: true },
    });
    api.route("GET /token", "index.handler", {
      auth: { custom: authorizer.id },
    });
    api.route("GET /{proxy+}", "index.handler");
    api.deploy();
  },
});
