/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-static-site-basic-auth",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const username = new sst.Secret("USERNAME");
    const password = new sst.Secret("PASSWORD");
    const basicAuth = $output([username.value, password.value]).apply(
      ([username, password]) =>
        Buffer.from(`${username}:${password}`).toString("base64")
    );

    const fn = new aws.cloudfront.Function("BasicAuth", {
      runtime: "cloudfront-js-2.0",
      code: $interpolate`
function handler(event) {
  if (!event.request.headers.authorization || event.request.headers.authorization.value !== "Basic ${basicAuth}") {
    return {
      statusCode: 401,
      headers: {
        "www-authenticate": { value: "Basic" }
      }
    };
  }
  return event.request;
}`,
    });

    // Basic Auth: username:password
    new sst.aws.StaticSite("MySite", {
      path: "site",
      edge: {
        viewerRequest: fn.arn,
      },
    });
  },
});
