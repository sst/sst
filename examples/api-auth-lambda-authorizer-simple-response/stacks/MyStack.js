import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create Lambda authorizer
    const authorizer = new apigAuthorizers.HttpLambdaAuthorizer({
      authorizerName: "LambdaAuthorizer",
      responseTypes: [apigAuthorizers.HttpLambdaResponseType.SIMPLE],
      handler: new sst.Function(this, "Authorizer", {
        handler: "src/authorizer.main",
      }),
    });

    // Create Api
    const api = new sst.Api(this, "Api", {
      defaultAuthorizer: authorizer,
      defaultAuthorizationType: sst.ApiAuthorizationType.CUSTOM,
      routes: {
        "GET /private": "src/private.main",
        "GET /public": {
          function: "src/public.main",
          authorizationType: sst.ApiAuthorizationType.NONE,
        },
      },
    });

    // Show the API endpoint and other info in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
