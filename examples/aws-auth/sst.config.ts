/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-auth",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const secrets = {
      GithubClientID: new sst.Secret("GithubClientID"),
      GithubClientSecret: new sst.Secret("GithubClientSecret"),
    };
    const auth = new sst.aws.Auth("Auth", {
      authenticator: {
        link: [secrets.GithubClientID, secrets.GithubClientSecret],
        handler: "./src/auth.handler",
        url: true,
      },
    });

    const api = new sst.aws.Function("Api", {
      handler: "./src/api.handler",
      link: [auth],
    });

    return {
      auth: auth.authenticator.url,
    };
  },
});
