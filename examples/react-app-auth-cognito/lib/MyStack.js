import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create a Cognito User Pool to manage auth
    const auth = new sst.Auth(this, "Auth", {
      cognito: {
        userPool: {
          // Users will login using their email and password
          signInAliases: { email: true, phone: true },
        },
      },
    });

    // Create an HTTP API
    const api = new sst.Api(this, "Api", {
      // Secure it with IAM Auth
      defaultAuthorizationType: sst.ApiAuthorizationType.AWS_IAM,
      routes: {
        "GET /private": "src/private.handler",
        // Make an endpoint public
        "GET /public": {
          function: "src/public.handler",
          authorizationType: sst.ApiAuthorizationType.NONE,
        },
      },
    });

    // Allow authenticated users to invoke the API
    auth.attachPermissionsForAuthUsers([api]);

    // Deploy our React app
    const site = new sst.ReactStaticSite(this, "ReactSite", {
      path: "frontend",
      // Pass in our environment variables
      environment: {
        REACT_APP_API_URL: api.url,
        REACT_APP_REGION: scope.region,
        REACT_APP_USER_POOL_ID: auth.cognitoUserPool.userPoolId,
        REACT_APP_IDENTITY_POOL_ID: auth.cognitoCfnIdentityPool.ref,
        REACT_APP_USER_POOL_CLIENT_ID:
          auth.cognitoUserPoolClient.userPoolClientId,
      },
    });

    // Show the endpoint in the output
    this.addOutputs({
      SiteUrl: site.url,
      ApiEndpoint: api.url,
    });
  }
}
