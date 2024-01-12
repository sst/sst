/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "test",
      removalPolicy: "remove",
      providers: {
        aws: {
          profile: "sst-dev",
        },
        cloudflare: {
          accountId: "15d29c8639fd3733b1b5486a2acfd968",
        },
      },
    };
  },
  async run() {
    $linkable(aws.sqs.Queue, function () {
      return {
        type: `{ url: string }`,
        value: {
          url: this.url,
        },
      };
    });

    const bucket = new sst.Bucket("MyBucket");
    const queue = new aws.sqs.Queue("MyQueue");
    const secret = new sst.Secret("StripeKey");

    const worker = new sst.Worker("MyWorker", {
      handler: "./src/index.ts",
    });

    const fn = new sst.Function("MyFunction", {
      url: true,
      link: [queue, bucket, secret],
      handler: "./src/index.handler",
    });

    return {
      url: fn.url,
    };
  },
});
