import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const authorizer = new apigAuthorizers.HttpLambdaAuthorizer({
      authorizerName: "LambdaAuthorizer",
      //responseTypes: [apigAuthorizers.HttpLambdaResponseType.SIMPLE],
      handler: new sst.Function(this, "Authorizer", {
        handler: "src/authorizer.main",
      }),
    });

    const api = new sst.Api(this, "Api", {
      defaultAuthorizationType: sst.ApiAuthorizationType.CUSTOM,
      defaultAuthorizer: authorizer,
      routes: {
        "GET /": "src/lambda.main",
      },
    });

    this.addOutputs({
      Endpoint: api.url,
    });
  }
}
