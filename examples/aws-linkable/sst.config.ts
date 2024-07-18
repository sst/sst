/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-linkable",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // make a native resource linkable
    sst.Linkable.wrap(aws.sns.Topic, (resource) => ({
      // these properties will be available when linked
      properties: {
        arn: resource.arn,
        name: resource.name,
      },
    }));
    const topic = new aws.sns.Topic("Topic");

    // create something that can be linked
    const existingResources = new sst.Linkable("ExistingResources", {
      properties: {
        bucketName: "existing-bucket",
        queueName: "existing-queue",
      },
      include: [
        sst.aws.permission({
          actions: ["s3:GetObject", "sns:Publish"],
          resources: ["*"],
        }),
      ],
    });

    const fn = new sst.aws.Function("Function", {
      handler: "index.handler",
      link: [topic, existingResources],
      url: true,
    });

    return {
      url: fn.url,
    };
  },
});
