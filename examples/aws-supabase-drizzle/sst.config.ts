/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "aws-supabase-drizzle",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        "@sst-provider/supabase": {
          accessToken: process.env.SUPABASE_ACCESS_TOKEN,
        },
        random: true,
      },
    };
  },
  async run() {
    $linkable(supabase.Project, function () {
      return {
        properties: {
          user: $interpolate`postgres.${this.id}`,
          password: this.databasePassword,
          host: $interpolate`aws-0-${this.region}.pooler.supabase.com`,
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
      handler: "./src/api.handler",
      link: [project],
    });
    return {
      url: api.url,
    };
  },
});
