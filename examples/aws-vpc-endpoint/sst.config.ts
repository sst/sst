/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-vpc-endpoint",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    try {
      await aws.ec2.getVpcEndpoint({
        vpcId: "vpc-0be8fa4de860608bb",
        serviceName: "com.amazonaws.us-east-1.s3",
        state: "available",
        filters: [
          {
            name: "vpc-endpoint-type",
            values: ["Interface"],
          },
        ],
      });
    } catch (e) {
      console.log(e);
    }
  },
});
