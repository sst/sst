import { StackContext, Table } from "@serverless-stack/resources";

export function Database({ stack }: StackContext) {
  const tableName: string = process.env.TABLE_NAME || "table";

  const table = new Table(stack, tableName, {
    fields: {
      pk: "string",
      sk: "string",
      gsi1pk: "string",
      gsi1sk: "string",
    },
    primaryIndex: {
      partitionKey: "pk",
      sortKey: "sk",
    },
    globalIndexes: {
      gsi1: {
        partitionKey: "gsi1pk",
        sortKey: "gsi1sk",
      },
    },
  });

  return table;
}
