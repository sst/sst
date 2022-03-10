import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create User Pool
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      signInCaseSensitive: false,
    });

    // Create User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: { userPassword: true },
    });

    // Create Api
    const api = new sst.Api(this, "Api", {
      defaultAuthorizer: new apigAuthorizers.HttpUserPoolAuthorizer(
        "Authorizer",
        userPool,
        {
          userPoolClients: [userPoolClient],
        }
      ),
      defaultAuthorizationType: sst.ApiAuthorizationType.JWT,
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
      UserPoolId: userPool.userPoolId,
      UserPoolClientId: userPoolClient.userPoolClientId,
    });
  }
}
