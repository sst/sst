import { StackContext, Table, AppSyncApi } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create a notes table
  const notesTable = new Table(stack, "Notes", {
    fields: {
      id: "string",
    },
    primaryIndex: { partitionKey: "id" },
  });

  // Create the AppSync GraphQL API
  const api = new AppSyncApi(stack, "AppSyncApi", {
    schema: "api/graphql/schema.graphql",
    defaults: {
      function: {
        // Bind the table name to the function
        bind: [notesTable],
      },
    },
    dataSources: {
      notes: "functions/main.handler",
    },
    resolvers: {
      "Query    listNotes": "notes",
      "Query    getNoteById": "notes",
      "Mutation createNote": "notes",
      "Mutation updateNote": "notes",
      "Mutation deleteNote": "notes",
    },
  });

  // Show the AppSync API Id in the output
  this.addOutputs({
    ApiId: api.apiId,
    ApiKey: api.cdk.graphqlApi.apiKey,
    APiUrl: api.url,
  });
}
