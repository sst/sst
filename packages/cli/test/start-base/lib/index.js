import * as cdk from "@aws-cdk/core";
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

import * as sst from "@serverless-stack/resources";

class MySampleStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const auth = new sst.Auth(this, "Auth", {
      cognito: {
        signInAliases: { email: true },
      },
    });

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        srcPath: "src/api",
      },
      defaultAuthorizer: new HttpUserPoolAuthorizer({
        userPool: auth.cognitoUserPool,
        userPoolClient: auth.cognitoUserPoolClient,
      }),
      defaultAuthorizationType: "JWT",
      routes: {
        "GET /public": { function: "api.main", authorizationType: "NONE" },
        "GET /private": { function: "api.main", authorizationType: "JWT" },
        "GET /private2": { function: "api.main", authorizationType: "JWT" },
        "GET /private3": { function: "api.main", authorizationType: "AWS_IAM" },
      },
    });

    // Show API endpoint in output
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.httpApi.apiEndpoint,
    });
  }
}

export default function main(app) {
  new MySampleStack(app, "sample");
}
