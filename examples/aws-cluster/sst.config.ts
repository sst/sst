/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-cluster",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const StripeKey = new sst.Secret("StripeKey");
    const vpc = $dev
      ? {
          id: "vpc-placeholder",
          subnets: [],
          securityGroups: [],
        }
      : new sst.aws.Vpc("MyVpc");
    const cluster = new sst.aws.Cluster("MyCluster", { vpc });
    cluster.addService("MyService", {
      architecture: "arm64",
      public: {
        domain: "cluster.ion.sst.sh",
        ports: [
          { listen: "80/http" },
          { listen: "443/https", forward: "80/http" },
        ],
      },
      link: [StripeKey],
    });
  },
});
