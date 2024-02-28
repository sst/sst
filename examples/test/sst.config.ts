/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "retain-all",
      providers: {
        aws: {},
        cloudflare: {},
      },
    };
  },
  async run() {
    new aws.dynamodb.Table("Web", {
      name: "/aweofih",
      billingMode: "PAY_PER_REQUEST",
    });
    return {};
  },
});
