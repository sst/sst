/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-drizzle",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const rds = new sst.aws.Postgres("MyPostgres");
    const api = new sst.aws.Function("MyApi", {
      url: true,
      link: [rds],
      handler: "src/api.handler",
    });

    return {
      url: api.url,
    };
  },
});
