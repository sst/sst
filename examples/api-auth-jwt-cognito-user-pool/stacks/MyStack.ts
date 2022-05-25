import * as cognito from "aws-cdk-lib/aws-cognito";
import { Api, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create User Pool
  const userPool = new cognito.UserPool(stack, "UserPool", {
    selfSignUpEnabled: true,
    signInAliases: { email: true },
    signInCaseSensitive: false,
  });

  // Create User Pool Client
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
    authFlows: { userPassword: true },
  });

  // Create Api
  const api = new Api(stack, "Api", {
    authorizers: {
      jwt: {
        type: "user_pool",
        userPool: {
          id: userPool.userPoolId,
          clientIds: [userPoolClient.userPoolClientId],
        },
      },
    },
    defaults: {
      authorizer: "jwt",
    },
    routes: {
      "GET /private": "functions/private.main",
      "GET /public": {
        function: "functions/public.main",
        authorizer: "none",
      },
    },
  });

  // Show the API endpoint and other info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    UserPoolId: userPool.userPoolId,
    UserPoolClientId: userPoolClient.userPoolClientId,
  });
}
