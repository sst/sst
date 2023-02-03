import { Api, Cognito, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create Api
  const api = new Api(stack, "Api", {
    routes: {
      "GET /private": "functions/private.main",
      "GET /public": {
        function: "functions/public.main",
        authorizer: "iam",
      },
    },
  });

  // Create auth provider
  const auth = new Cognito(stack, "Auth", {
    identityPoolFederation: {
      twitter: {
        consumerKey: "gyMbPOiwefr6x63SjIW8NN0d1",
        consumerSecret: "qxld8zic5c2eyahqK3gjGLGQaOTogGfAgHh17MYOIcOUR9l2Nz",
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
