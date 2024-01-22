/// <reference path="./.sst/src/global.d.ts" />

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
    return runCloudflareExample();

    //const bucket = new sst.Bucket("MyApp");
    //const app = new sst.Function("MyApp", {
    //  bundle: "functions/bundled-example",
    //  handler: "index.handler",
    //  link: [bucket],
    //  url: true,
    //});

    return {
      app: app.url,
    };
  },
});

function runCloudflareExample() {
  const bucket = new sst.Bucket("MyBucket");
  const worker = new sst.Worker("MyApp", {
    handler: "functions/worker-example/index.ts",
    link: [bucket],
    devUrl: true,
  });
  return { app: worker.devUrl };
}

function runVectorExample() {
  const vector = new sst.Vector("MyVectorDB", {
    model: "text-embedding-ada-002",
    //model: "amazon.titan-embed-image-v1",
    openAiApiKey: new sst.Secret("OpenAiApiKey").value,
  });

  const seeder = new sst.Function("Seeder", {
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

  const app = new sst.Function("MyApp", {
    handler: "functions/vector-example/index.app",
    link: [vector],
    url: true,
  });

  return { seeder: seeder.url, app: app.url };
}
