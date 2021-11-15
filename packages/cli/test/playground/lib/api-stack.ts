import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  public readonly api: sst.Api;

  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    new sst.Auth(this, "Auth", {
      cognito: true,
    });

    new sst.Queue(this, "MyQueue", {
      consumer: "src/lambda.main",
    });

    // Create Api with custom domain
    const api = new sst.Api(this, "Api", {
      customDomain: "api.sst.sh",
      defaultFunctionProps: {
        timeout: 10,
      },
      routes: {
        "GET /": "src/lambda.main",
        $default: "src/lambda.main",
      },
    });

    this.api = api;

    this.addOutputs({
      Endpoint: api.url || "no-url",
      CustomEndpoint: api.customDomainUrl || "no-custom-url",
    });

    this.exportValue(api.url);

    // Create Api without custom domain
    const apiNoDomain = new sst.Api(this, "NoDomain", {
      routes: {
        "GET /": "src/lambda.main",
      },
    });
    this.addOutputs({
      EndpointNoDomain: apiNoDomain.url || "no-url",
    });
  }
}
