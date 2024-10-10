/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "playground",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const ret: Record<string, $util.Output<string>> = {};

    const vpc = addVpc();
    const bucket = addBucket();
    //const app = addFunction();
    //const service = addService();
    //const cron = addCron();

    return ret;

    function addVpc() {
      return new sst.aws.Vpc("MyVpc");
    }

    function addBucket() {
      const bucket = new sst.aws.Bucket("MyBucket");
      ret.bucket = bucket.name;
      return bucket;
    }

    function addCron() {
      const cron = new sst.aws.Cron("MyCron", {
        schedule: "rate(1 minute)",
        job: {
          handler: "functions/handler-example/index.handler",
          link: [bucket],
        },
      });
      ret.cron = cron.nodes.job.name;
      return cron;
    }

    function addFunction() {
      const app = new sst.aws.Function("MyApp", {
        handler: "functions/handler-example/index.handler",
        link: [bucket],
        url: true,
      });
      ret.app = app.url;
      return app;
    }

    function addService() {
      const cluster = new sst.aws.Cluster("MyCluster", { vpc });
      const service = cluster.addService("MyService", {
        public: {
          ports: [{ listen: "80/http" }],
        },
        image: {
          context: "cluster",
        },
        link: [bucket],
      });
      ret.service = service.url;

      return service;
    }
  },
});
