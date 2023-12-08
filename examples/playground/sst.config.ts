/// <reference path="./.sst/src/global.d.ts" />

export default {
  config() {
    return {
      name: "playground",
      region: "us-east-1",
    };
  },
  async run() {
    //const site = new sst.Function("web", {
    //  customDomain: {
    //    queueName: "q",
    //    queueUrl: "q.sqs.us-east-1.amazonaws.com/123456789012/q",
    //    queueArn: "arn:aws:sqs:us-east-1:123456789012:q",

    //    hostedZone: "example.com",
    //    hostedZoneId:
    //      "Z2FDTNDATAQYW2" |
    //      aws.route53.Zone.get({ zoneId: "Z2FDTNDATAQYW2" }).zoneId,
    //    hostedZoneArn:
    //      "Z2FDTNDATAQYW2" |
    //      aws.route53.Zone.get({ zoneId: "Z2FDTNDATAQYW2" }).zoneId,

    //    hostedZone: "example.com",
    //    cdk: {
    //      hostedZone: cdk.import(),
    //    },
    //  },
    //});

    const bucket = new aws.s3.Bucket("web");

    const provider = new aws.Provider(`${app.name}-provider`, {
      region: "us-west-1",
    });
    const site = new sst.Function(
      "web",
      {
        runtime: "nodejs18.x",
        bundle: "bundled-function",
        handler: "index.handler",
        url: true,
        //bind: bucket,
      },
      { provider }
    );

    return {
      siteURL: site.url,
    };
  },
};
