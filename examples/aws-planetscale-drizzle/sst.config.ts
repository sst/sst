/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "aws-planetscale-drizzle",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        "@sst-provider/planetscale": {},
      },
    };
  },
  async run() {
    $linkable(planetscale.Password, function () {
      return {
        properties: {
          host: this.accessHostUrl,
          username: this.username,
          password: this.plaintext,
        },
      };
    });
    const db = new planetscale.Database("Database", {
      name: $interpolate`${$app.name}-${$app.stage}-Database`,
      organization: "sst",
      clusterSize: "PS_10",
    });
    // const dbCreds = new planetscale.Password("DatabasePassword", {
    //   organization: "sst",
    //   database: db.defaultBranch,
    //   role: "admin",
    //   branch: db.defaultBranch,
    // });
    const api = new sst.aws.Function("Api", {
      url: true,
      handler: "./src/api.handler",
      // link: [dbCreds],
    });
    return {
      url: api.url,
    };
  },
});
