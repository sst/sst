import { NextjsSite, StackContext, Table } from "sst/constructs";

export function ExampleStack({ stack, app }: StackContext) {
  // Create the table
  const table = new Table(stack, "Counter", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  // Create a Next.js site
  const site = new NextjsSite(stack, "Site", {
    path: "packages/frontend",
    environment: {
      // Pass the table details to our app
      REGION: app.region,
      TABLE_NAME: table.tableName,
    },
  });

  // Allow the Next.js API to access the table
  site.attachPermissions([table]);

  // Show the site URL in the output
  stack.addOutputs({
    URL: site.url,
  });
}
