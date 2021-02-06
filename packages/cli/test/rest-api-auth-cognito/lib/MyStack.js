import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { account, region } = sst.Stack.of(this);

    // Create Api
    const api = new sst.Api(this, "Api", {
      // By default all routes require authorization
      defaultAuthorizationType: "AWS_IAM",
      routes: {
        // Create a private route
        "GET /private": "src/private.main",
        // Create a public route by overriding the authorizationtType for this route
        "GET /public": {
          authorizationType: "NONE",
          function: "src/public.main",
        },
      },
    });

    // Create auth provider
    const auth = new sst.Auth(this, "Auth", {
      // Create a Cognito User Pool to manage user's authentication info.
      cognito: {
        // Users will login using their email and password
        signInAliases: { email: true },
      },
    });

    // Allow authenticated users invoke API
    auth.attachPermissionsForAuthUsers([
      new iam.PolicyStatement({
        actions: ["execute-api:Invoke"],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:execute-api:${region}:${account}:${api.httpApi.httpApiId}/*`,
        ],
      }),
    ]);

    // Show API endpoint in output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.httpApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, "UserPoolId", {
      value: auth.cognitoUserPool.userPoolId,
    });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: auth.cognitoUserPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: auth.cognitoCfnIdentityPool.ref,
    });
  }
}
