import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // Create a notes table
    const notesTable = new sst.Table(this, "Notes", {
      fields: {
        id: "string",
      },
      primaryIndex: { partitionKey: "id" },
    });

    // Create the AppSync GraphQL API
    const api = new sst.AppSyncApi(this, "AppSyncApi", {
      schema: "graphql/schema.graphql",
      defaults: {
        function: {
          // Pass the table name to the function
          environment: {
            NOTES_TABLE: notesTable.tableName,
          },
        },
      },
      dataSources: {
        notes: "main.handler",
      },
      resolvers: {
        "Query    listNotes": "notes",
        "Query    getNoteById": "notes",
        "Mutation createNote": "notes",
        "Mutation updateNote": "notes",
        "Mutation deleteNote": "notes",
      },
    });

    // Enable the AppSync API to access the DynamoDB table
    api.attachPermissions([notesTable]);

    // Show the AppSync API Id in the output
    this.addOutputs({
      ApiId: api.apiId,
      APiUrl: api.url,
    });
  }
}
