/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "topic",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const topic = new sst.aws.SnsTopic("MyTopic");
    topic.subscribe("subscriber.handler", {
      filter: {
        foo: ["bar"],
      },
    });

    const app = new sst.aws.Function("MyApp", {
      handler: "publisher.handler",
      link: [topic],
      url: true,
    });

    return {
      app: app.url,
      topic: topic.name,
    };
  },
});
