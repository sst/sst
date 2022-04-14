import { Api, Auth, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create Api
  const api = new Api(stack, "Api", {
    routes: {
      "GET /private": "private.main",
      "GET /public": {
        function: "public.main",
        authorizer: "iam",
      },
    },
  });

  // Create auth provider
  const auth = new Auth(stack, "Auth", {
    identityPoolFederation: {
      twitter: {
        consumerKey: "gyMbPOiwefr6x63SjIW8NN0d1",
        consumerSecret: "qxld8zic5c2eyahqK3gjGLGQaOTogGfAgHh17MYOIcOUR9l2Nz",
      },
    },
  });

  // Allow authenticated users invoke API
  auth.attachPermissionsForAuthUsers([api]);

  // Show the API endpoint and other info in the output
  this.addOutputs({
    ApiEndpoint: api.url,
    IdentityPoolId: auth.cognitoIdentityPoolId,
  });
}
