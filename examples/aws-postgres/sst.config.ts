/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-postgres",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // NAT Gateways are required for Lambda functions
    const vpc = new sst.aws.Vpc("MyVpc", { bastion: true });
    const postgres = new sst.aws.Postgres("MyDatabase", {
      vpc,
    });
    const app = new sst.aws.Function("MyApp", {
      handler: "index.handler",
      url: true,
      link: [postgres],
      nodejs: {
        esbuild: {
          external: ["pg"],
        },
      },
    });

    return {
      app: app.url,
      host: postgres.host,
      port: postgres.port,
      username: postgres.username,
      password: postgres.password,
      database: postgres.database,
    };
  },
});
