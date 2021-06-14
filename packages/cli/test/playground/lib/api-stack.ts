import * as apig from "@aws-cdk/aws-apigateway";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const api = new sst.Api(this, "Api", {
      customDomain: "api.sst.sh",
      defaultFunctionProps: {
        timeout: 3,
      },
      routes: {
        "GET /": "src/lambda.main",
      },
    });

    new sst.ApiGatewayV1Api(this, "ImportedLegacyApi", {
      restApi: apig.RestApi.fromRestApiAttributes(this, "ILegacyApi", {
        restApiId: "2x7syiara0",
        rootResourceId: "rz21vbtuih",
      }),
      routes: {
        "GET /sub123": "src/lambda.main",
      },
    });

    this.addOutputs({
      Endpoint: api.url || "no-url",
      CustomEndpoint: api.customDomainUrl || "no-custom-url",
    });
  }
}
