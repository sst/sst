/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Link multiple secrets
 *
 * You might have multiple secrets that need to be used across your app. It can be tedious to
 * create a new secret and link it to each function or resource.
 *
 * A common pattern to addresses this is to create an object with all your secrets and then
 * link them all at once. Now when you have a new secret, you can add it to the object and
 * it will be automatically available to all your resources.
 */
export default $config({
  app(input) {
    return {
      name: "secret-link-all",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Manage all secrets together
    const secrets = {
      secret1: new sst.Secret("Secret1", "some-secret-value-1"),
      secret2: new sst.Secret("Secret2", "some-secret-value-2"),
    };
    const allSecrets = Object.values(secrets);

    const bucket = new sst.aws.Bucket("MyBucket");

    const api = new sst.aws.Function("MyApi", {
      link: [bucket, ...allSecrets],
      handler: "index.handler",
      url: true,
    });

    return {
      url: api.url,
    };
  },
});
