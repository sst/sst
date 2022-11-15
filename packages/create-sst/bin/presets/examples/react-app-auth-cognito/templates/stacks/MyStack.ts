import {
  Api,
  Cognito,
  StaticSite,
  StackContext
} from "@serverless-stack/resources";

export function MyStack({ stack, app }: StackContext) {
  // Create a Cognito User Pool to manage auth
  const auth = new Cognito(stack, "Auth", {
    login: ["email", "phone"]
  });

  // Create an HTTP API
  const api = new Api(stack, "Api", {
    // Secure it with IAM Auth
    defaults: {
      authorizer: "iam"
    },
    routes: {
      "GET /private": "functions/private.handler",
      // Make an endpoint public
      "GET /public": {
        function: "functions/public.handler",
        authorizer: "none"
      }
    }
  });

  // Allow authenticated users to invoke the API
  auth.attachPermissionsForAuthUsers(stack, [api]);

  // Deploy our React app
  const site = new StaticSite(stack, "ReactSite", {
    path: "frontend",
    buildCommand: "npm run build",
    buildOutput: "build",
    // Pass in our environment variables
    environment: {
      REACT_APP_API_URL: api.url,
      REACT_APP_REGION: app.region,
      REACT_APP_USER_POOL_ID: auth.userPoolId,
      REACT_APP_IDENTITY_POOL_ID: auth.cognitoIdentityPoolId,
      REACT_APP_USER_POOL_CLIENT_ID: auth.userPoolClientId
    }
  });

  // Show the endpoint in the output
  stack.addOutputs({
    SiteUrl: site.url,
    ApiEndpoint: api.url,
  });
}
