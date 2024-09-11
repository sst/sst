/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-nextjs-basic-auth",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const username = new sst.Secret("USERNAME");
    const password = new sst.Secret("PASSWORD");
    const basicAuth = $output([username.value, password.value]).apply(
      ([username, password]) =>
        Buffer.from(`${username}:${password}`).toString("base64")
    );

    new sst.aws.Nextjs("MyWeb", {
      server: {
        edge: {
          viewerRequest: {
            injection: $interpolate`
if (!event.request.headers.authorization || event.request.headers.authorization.value !== "Basic ${basicAuth}") {
  return {
    statusCode: 401,
    headers: {
      "www-authenticate": { value: "Basic" }
    }
  };
}`,
          },
        },
      },
    });
  },
});
