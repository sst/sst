/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-apig-websocket",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayWebSocket("MyApi", {});
    api.route("$connect", "lambda.connect");
    api.route("$disconnect", "lambda.disconnect");
    api.route("$default", { handler: "lambda.catchAll", link: [api] });
    api.route("sendmessage", "lambda.sendMessage");

    return {
      managementEndpoint: api.managementEndpoint,
    };
  },
});
