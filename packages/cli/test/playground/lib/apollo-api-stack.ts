import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const api = new sst.ApolloApi(this, "Api", {
      server: "src/apollo/graphql.handler",
    });

    this.addOutputs({
      Endpoint: api.url || "no-url",
      CustomEndpoint: api.customDomainUrl || "no-custom-url",
    });
  }
}
