import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const api = new sst.AppSyncApi(this, "AppSyncApi", {
      schema: "src/appsync/schema.graphql",
      customDomain: "appsync.sst.sh",
      dataSources: {
        mainDS: "src/appsync/lambda.main",
      },
      resolvers: {
        "Query license": "mainDS",
      },
    });

    this.addOutputs({
      ApiId: api.apiId,
      ApiKey: api.cdk.graphqlApi.apiKey!,
      CustomDomain: api.customDomainUrl!,
    });
  }
}
