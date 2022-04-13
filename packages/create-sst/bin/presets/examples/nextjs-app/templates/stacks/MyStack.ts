import { NextjsSite, StackContext, Table } from "@serverless-stack/resources";

export function MyStack({ stack, app }: StackContext) {
  // Create the table
  const table = new Table(this, "Counter", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  // Create a Next.js site
  const site = new NextjsSite(this, "Site", {
    path: "frontend",
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
