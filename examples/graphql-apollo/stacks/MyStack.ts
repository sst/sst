import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    // Create the Apollo GraphQL API
    const api = new sst.ApolloApi(this, "ApolloApi", {
      server: "src/lambda.handler",
    });

    // Show the API endpoint in output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
