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
          cognito.UserPoolClientIdentityProvider.FACEBOOK,
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

  // Throw error if App ID & secret are not provided
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET)
    throw new Error("Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET");

  // Create a Facebook OAuth provider
  const provider = new cognito.UserPoolIdentityProviderFacebook(
    stack,
    "Facebook",
    {
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      userPool: auth.cdk.userPool,
      attributeMapping: {
        email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
        givenName: cognito.ProviderAttribute.FACEBOOK_NAME,
      },
    }
  );

  // attach the created provider to our userpool
  auth.cdk.userPoolClient.node.addDependency(provider);

  // Create a cognito userpool domain
  const domain = auth.cdk.userPool.addDomain("AuthDomain", {
    cognitoDomain: {
      domainPrefix: `${app.stage}-fb-demo-auth-domain`,
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
      "GET /private": "packages/functions/srcprivate.handler",
      "GET /public": {
        function: "packages/functions/srcpublic.handler",
        authorizer: "none",
      },
    },
  });

  // Allow authenticated users invoke API
  auth.attachPermissionsForAuthUsers(stack, [api]);

  // Create a React Static Site
  const site = new StaticSite(stack, "Site", {
    path: "frontend",
    buildCommand: "npm run build",
    buildOutput: "dist",
    environment: {
      VITE_APP_COGNITO_DOMAIN: domain.domainName,
      VITE_APP_API_URL: api.url,
      VITE_APP_REGION: app.region,
      VITE_APP_USER_POOL_ID: auth.userPoolId,
      VITE_APP_IDENTITY_POOL_ID: auth.cognitoIdentityPoolId!,
      VITE_APP_USER_POOL_CLIENT_ID: auth.userPoolClientId,
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    api_url: api.url,
    auth_client_id: auth.userPoolClientId,
    auth_domain: `https://${domain.domainName}.auth.${app.region}.amazoncognito.com`,
    site_url: site.url,
  });
}
