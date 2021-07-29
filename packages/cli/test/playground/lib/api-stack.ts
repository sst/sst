import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  public readonly api: sst.Api;

  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const api = new sst.Api(this, "Api", {
      customDomain: "api.sst.sh",
      defaultFunctionProps: {
        timeout: 10,
      },
      routes: {
        "GET /": "src/lambda.main",
        "$default": "src/lambda.main",
      },
    });

    this.api = api;

    this.addOutputs({
      Endpoint: api.url || "no-url",
      CustomEndpoint: api.customDomainUrl || "no-custom-url",
    });
  }
}
