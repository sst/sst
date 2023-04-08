import { Api, StackContext, StaticSite, Table } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  const table = new Table(stack, "Counter", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Bind the table name to our API
        bind: [table],
      },
    },
    routes: {
      "POST /": "packages/functions/src/lambda.main",
    },
  });

  const site = new StaticSite(stack, "VueJSSite", {
    path: "packages/frontend",
    buildOutput: "dist",
    buildCommand: "npm run build",
    errorPage: "redirect_to_index_page",
    environment: {
      // Pass in the API endpoint to our app
      VUE_APP_API_URL: api.url,
    },
  });

  // Show the URLs in the output
  stack.addOutputs({
    SiteUrl: site.url,
    ApiEndpoint: api.url,
  });
}
