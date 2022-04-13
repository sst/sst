import {
  Api,
  StackContext,
  StaticSite,
  Table,
} from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  const table = new Table(stack, "Counter", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  // Create a HTTP API
  const api = new Api(this, "Api", {
    defaults: {
      function: {
        // Pass in the table name to our API
        environment: {
          tableName: table.tableName,
        },
      },
    },
    routes: {
      "POST /": "src/lambda.main",
    },
  });

  // Allow the API to access the table
  api.attachPermissions([table]);

  const site = new StaticSite(this, "GatsbySite", {
    path: "frontend",
    buildOutput: "public",
    buildCommand: "npm run build",
    errorPage: "redirect_to_index_page",
    environment: {
      // Pass in the API endpoint to our app
      GATSBY_APP_API_URL: api.url,
    },
  });

  // Show the URLs in the output
  stack.addOutputs({
    SiteUrl: site.url,
    ApiEndpoint: api.url,
  });
}
