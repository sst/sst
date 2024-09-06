/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-supabase-drizzle",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        random: true,
        supabase: true,
      },
    };
  },
  async run() {
    sst.Linkable.wrap(supabase.Project, function (item) {
      return {
        properties: {
          user: $interpolate`postgres.${item.id}`,
          password: item.databasePassword,
          host: $interpolate`aws-0-${item.region}.pooler.supabase.com`,
          port: 5432,
          database: "postgres",
        },
      };
    });
    const project = new supabase.Project("Database", {
      name: $interpolate`${$app.name}-${$app.stage}`,
      region: "us-east-1",
      organizationId: process.env.SUPABASE_ORG_ID!,
      databasePassword: new random.RandomString("DatabasePassword", {
        length: 16,
      }).result,
    });
    const api = new sst.aws.Function("Api", {
      url: true,
      handler: "src/api.handler",
      link: [project],
    });
    return {
      url: api.url,
    };
  },
});
