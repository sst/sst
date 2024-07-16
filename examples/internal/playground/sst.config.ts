/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "playground",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  console: {
    autodeploy: {
      target(event) {
        if (
          event.type === "branch" &&
          event.branch === "dev" &&
          event.action === "pushed"
        ) {
          return { stage: "dev" };
        }
      },
      workflow(context) {
        context.install();
        context.shell("cd examples/internal/playground && npm install");
        context.deploy();
      },
    },
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      public: true,
      transform: {
        bucket: (args) => {
          args.tags = { foo: "bar" };
        },
      },
    });

    const app = new sst.aws.Function("MyApp", {
      handler: "functions/handler-example/index.handler",
      link: [bucket],
      url: true,
    });

    return {
      bucket: bucket.name,
      app: app.url,
    };
  },
});
