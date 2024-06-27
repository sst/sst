/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "database-benchmark",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: { planetscale: true, cloudflare: true },
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("Vpc");

    const pscaleDB = new planetscale.Database("PlanetscaleDatabase", {
      name: $app.name,
      organization: "sst",
      clusterSize: "PS_10",
      region: "us-east",
    });

    const pscalePassword = new planetscale.Password("PlanetscalePassword", {
      organization: pscaleDB.organization,
      database: pscaleDB.name,
      branch: pscaleDB.defaultBranch,
      name: $app.stage,
    });

    const pscale = new sst.Resource("Planetscale", {
      host: pscalePassword.accessHostUrl,
      database: pscalePassword.database,
      username: pscalePassword.username,
      password: pscalePassword.plaintext,
    });

    const postgres = new sst.aws.Postgres("Postgres", {
      vpc,
    });

    const worker = new sst.cloudflare.Worker("Worker", {
      link: [pscale],
      handler: "./src/worker.ts",
      transform: {
        worker: {
          placements: [
            {
              mode: "smart",
            },
          ],
        },
      },
      url: true,
    });

    const lambda = new sst.aws.Function("Lambda", {
      live: false,
      url: true,
      link: [postgres, pscale],
      handler: "./src/lambda.handler",
    });

    return {
      lambda: lambda.url,
      worker: worker.url,
    };
  },
});
