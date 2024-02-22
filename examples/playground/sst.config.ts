/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "playground",
      providers: {
        aws: {
          region: "us-east-1",
        },
        cloudflare: {
          accountId: "24beb0945bae6b37c2b147db108c6ec8",
        },
      },
      removalPolicy: "remove",
    };
  },
  async run() {
    //return runVectorExample();

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

function runVectorExample() {
  const vector = new sst.aws.Vector("MyVectorDB", {
    model: "text-embedding-ada-002",
    //model: "amazon.titan-embed-image-v1",
    openAiApiKey: new sst.Secret("OpenAiApiKey").value,
  });

  const seeder = new sst.aws.Function("Seeder", {
    handler: "functions/vector-example/index.seeder",
    link: [vector],
    copyFiles: [
      { from: "functions/vector-example/iron-man.jpg", to: "iron-man.jpg" },
      {
        from: "functions/vector-example/black-widow.jpg",
        to: "black-widow.jpg",
      },
      {
        from: "functions/vector-example/spider-man.jpg",
        to: "spider-man.jpg",
      },
      { from: "functions/vector-example/thor.jpg", to: "thor.jpg" },
      {
        from: "functions/vector-example/captain-america.jpg",
        to: "captain-america.jpg",
      },
    ],
    url: true,
  });

  const app = new sst.aws.Function("MyApp", {
    handler: "functions/vector-example/index.app",
    link: [vector],
    url: true,
  });

  return { seeder: seeder.url, app: app.url };
}
