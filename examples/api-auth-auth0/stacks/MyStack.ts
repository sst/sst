import { StackContext, Api, Cognito } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create Api
  const api = new Api(stack, "Api", {
    defaults: {
      authorizer: "iam",
    },
    routes: {
      "GET /private": "functions/private.main",
      "GET /public": {
        function: "functions/public.main",
        authorizer: "none",
      },
    },
  });

  // Create auth provider
  const auth = new Cognito(stack, "Auth", {
    identityPoolFederation: {
      auth0: {
        domain: "https://myorg.us.auth0.com",
        clientId: "UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif",
      },
    },
  });

  // Allow authenticated users invoke API
  auth.attachPermissionsForAuthUsers(stack, [api]);

  // Show the API endpoint and other info in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    IdentityPoolId: auth.cognitoIdentityPoolId,
  });
}
