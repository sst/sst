import { StackContext, Api, Auth, ViteStaticSite, Table, Config } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create a database Table
  const table = new Table(stack, "Users", {
    fields: {
      userId: "string",
    },
    primaryIndex: { partitionKey: "userId" },
  });

  // Create Api
  const api = new Api(stack, "api", {
    defaults: {
      function: {
        config: [
          new Config.Parameter(stack, "TABLE_NAME", { value: table.tableName }),
        ],
        permissions: [table],
      },
    },
    routes: {
      "GET /": "functions/lambda.handler",
      "GET /session": "functions/session.handler",
    },
  });

  // Create a React site
  const site = new ViteStaticSite(stack, "Site", {
    path: "web",
    environment: {
      VITE_APP_API_URL: api.url,
    },
  });

  // Create Auth provider
  const auth = new Auth(stack, "auth", {
    authenticator: {
      handler: "functions/auth.handler",
      config: [
        new Config.Parameter(stack, "SITE_URL", { value: site.url })
      ],
    },
  });
  auth.attach(stack, {
    api,
    prefix: "/auth",
  });

  // Show the API endpoint and other info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    SiteURL: site.url,
  });
}