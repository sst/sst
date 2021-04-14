import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const api = new sst.AppSyncApi(this, "AppSyncApi", {
      graphqlApi: {
        schema: "src/appsync/schema.graphql",
      },
      dataSources: {
        mainDS: "src/appsync/lambda.main",
      },
      resolvers: {
        "Query license": "mainDS",
      },
    });

    this.addOutputs({
      ApiId: api.graphqlApi.apiId,
    });
  }
}
