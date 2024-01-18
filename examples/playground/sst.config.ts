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
    const vector = new sst.Vector("MyVectorDB", {
      //model: "amazon.titan-embed-image-v1",
      model: "text-embedding-ada-002",
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
  },
});
