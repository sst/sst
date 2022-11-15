import {
  StackContext,
  Api,
  Cognito,
  StaticSite
} from "@serverless-stack/resources";
import * as cognito from "aws-cdk-lib/aws-cognito";

export function MyStack({ stack, app }: StackContext) {
  const auth = new Cognito(stack, "Auth", {
    cdk: {
      userPoolClient: {
        supportedIdentityProviders: [
          {
            name: "GitHub"
          }
        ],
        oAuth: {
          callbackUrls: [
            app.stage === "prod"
              ? "https://my-app.com"
              : "http://localhost:3000"
          ],
          logoutUrls: [
            app.stage === "prod"
              ? "https://my-app.com"
              : "http://localhost:3000"
          ]
        }
      }
    }
  });

  const api = new Api(stack, "api", {
    authorizers: {
      userPool: {
        type: "user_pool",
        userPool: {
          id: auth.userPoolId,
          clientIds: [auth.userPoolClientId]
        }
      }
    },
    defaults: {
      authorizer: "none"
    },
    routes: {
      "GET /public": "functions/public.handler",
      "GET /user": "functions/user.handler",
      "POST /token": "functions/token.handler",
      "GET /private": {
        function: "functions/private.handler",
        authorizer: "userPool"
      }
    }
  });

  // Allow authenticated users invoke API
  auth.attachPermissionsForAuthUsers(stack, [api]);

  // Throw error if client ID & secret are not provided
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET)
    throw new Error("Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET");

  // Create a GitHub OIDC IDP
  const idp = new cognito.CfnUserPoolIdentityProvider(
    stack,
    "GitHubIdentityProvider",
    {
      providerName: "GitHub",
      providerType: "OIDC",
      userPoolId: auth.userPoolId,
      providerDetails: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        attributes_request_method: "GET",
        oidc_issuer: "https://github.com",
        authorize_scopes: "openid user",
        authorize_url: "https://github.com/login/oauth/authorize",
        token_url: api.url + "/token",
        attributes_url: api.url + "/user",
        jwks_uri: api.url + "/token"
      },
      attributeMapping: {
        email: "email",
        name: "name",
        picture: "avatar_url"
      }
    }
  );

  // attach the IDP to the client
  auth.cdk.userPoolClient.node.addDependency(idp);

  // Create a cognito userpool domain
  const domain = auth.cdk.userPool.addDomain("AuthDomain", {
    cognitoDomain: {
      domainPrefix: `${app.stage}-github-demo-oauth`
    }
  });

  // Create a React Static Site
  const site = new StaticSite(stack, "Site", {
    path: "frontend",
    buildCommand: "npm run build",
    buildOutput: "dist",
    environment: {
      VITE_APP_COGNITO_DOMAIN: domain.domainName,
      VITE_APP_STAGE: app.stage,
      VITE_APP_API_URL: api.url,
      VITE_APP_REGION: app.region,
      VITE_APP_USER_POOL_ID: auth.userPoolId,
      VITE_APP_IDENTITY_POOL_ID: auth.cognitoIdentityPoolId,
      VITE_APP_USER_POOL_CLIENT_ID: auth.userPoolClientId
    }
  });

  // Show the endpoint in the output
  stack.addOutputs({
    api_endpoint: api.url,
    auth_client_id: auth.userPoolClientId,
    domain: domain.domainName,
    site_url: site.url
  });
}
