import {
  Table,
  RemixSite,
  StackContext,
} from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {

  // Create a DynamoDB table
  const table = new Table(stack, "Counter", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  // Create a Remix site
  const site = new RemixSite(stack, "web", {
    path: "web/",
    environment: {
      REGION: stack.region,
      TABLE_NAME: table.tableName,
    }
  })
  site.attachPermissions([table]);

  stack.addOutputs({
    SiteURL: site.url,
    TableName: table.tableName,
  });
}
