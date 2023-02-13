import * as cognito from "aws-cdk-lib/aws-cognito";
import {
  Api,
  Cognito,
  StaticSite,
  StackContext,
} from "sst/constructs";

export function ExampleStack({ stack, app }: StackContext) {
  // Create auth
  const auth = new Cognito(stack, "Auth", {
    cdk: {
      userPoolClient: {
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.GOOGLE,
        ],
        oAuth: {
          callbackUrls: [
            app.stage === "prod"
              ? "prodDomainNameUrl"
              : "http://localhost:3000",
          ],
          logoutUrls: [
            app.stage === "prod"
              ? "prodDomainNameUrl"
              : "http://localhost:3000",
          ],
        },
      },
    },
  });

  // Throw error if client ID & secret are not provided
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    throw new Error("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");

  // Create a Google OAuth provider
  const provider = new cognito.UserPoolIdentityProviderGoogle(stack, "Google", {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    userPool: auth.cdk.userPool,
    scopes: ["profile", "email", "openid"],
    attributeMapping: {
      email: cognito.ProviderAttribute.GOOGLE_EMAIL,
      givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
      familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
      profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
    },
  });

  // attach the created provider to our userpool
  auth.cdk.userPoolClient.node.addDependency(provider);

  // Create a cognito userpool domain
  const domain = auth.cdk.userPool.addDomain("AuthDomain", {
    cognitoDomain: {
      domainPrefix: `${app.stage}-demo-auth-domain`,
    },
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    authorizers: {
      userPool: {
        type: "user_pool",
        userPool: {
          id: auth.userPoolId,
          clientIds: [auth.userPoolClientId],
        },
      },
    },
    defaults: {
      authorizer: "userPool",
    },
    routes: {
      "GET /private": "packages/functions/src/private.handler",
      "GET /public": {
        function: "packages/functions/src/public.handler",
        authorizer: "none",
      },
    },
  });

  // Allow authenticated users invoke API
  auth.attachPermissionsForAuthUsers(stack, [api]);

  // Create a React Static Site
  const site = new StaticSite(stack, "Site", {
    path: "packages/frontend",
    buildCommand: "npm run build",
    buildOutput: "dist",
    environment: {
      VITE_APP_COGNITO_DOMAIN: domain.domainName,
      VITE_APP_API_URL: api.url,
      VITE_APP_REGION: app.region,
      VITE_APP_USER_POOL_ID: auth.userPoolId,
      VITE_APP_IDENTITY_POOL_ID: auth.cognitoIdentityPoolId,
      VITE_APP_USER_POOL_CLIENT_ID: auth.userPoolClientId,
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
    authClientId: auth.userPoolClientId,
    domain: domain.domainName,
    site_url: site.url,
  });
}
