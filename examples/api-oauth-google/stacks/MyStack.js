import * as sst from "@serverless-stack/resources";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create auth
    const auth = new sst.Auth(this, "Auth", {
      cognito: {
        userPoolClient: {
          supportedIdentityProviders: [
            cognito.UserPoolClientIdentityProvider.GOOGLE,
          ],
          oAuth: {
            callbackUrls: [
              scope.stage === "prod"
                ? "prodDomainNameUrl"
                : "http://localhost:3000",
            ],
            logoutUrls: [
              scope.stage === "prod"
                ? "prodDomainNameUrl"
                : "http://localhost:3000",
            ],
          },
        },
      },
    });

    // Throw error if client ID & secret are not provided
    if (
      !auth.cognitoUserPool ||
      !auth.cognitoUserPoolClient ||
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET
    ) {
      throw new Error("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
    }

    // Create a Google OAuth provider
    const provider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "Google",
      {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        userPool: auth.cognitoUserPool,
        scopes: ["profile", "email", "openid"],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      }
    );

    // attach the created provider to our userpool
    auth.cognitoUserPoolClient.node.addDependency(provider);

    // Create a cognito userpool domain
    const domain = auth.cognitoUserPool.addDomain("AuthDomain", {
      cognitoDomain: {
        domainPrefix: `${scope.stage}-demo-auth-domain`,
      },
    });

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultAuthorizer: new apigAuthorizers.HttpUserPoolAuthorizer(
        "Authorizer",
        auth.cognitoUserPool,
        {
          userPoolClients: [auth.cognitoUserPoolClient],
        }
      ),
      defaultAuthorizationType: sst.ApiAuthorizationType.JWT,
      routes: {
        "GET /private": "src/private.handler",
        "GET /public": {
          function: "src/public.handler",
          authorizationType: sst.ApiAuthorizationType.NONE,
        },
      },
    });

    // Allow authenticated users invoke API
    auth.attachPermissionsForAuthUsers([api]);

    // Create a React Static Site
    const site = new sst.ViteStaticSite(this, "Site", {
      path: "frontend",
      environment: {
        VITE_APP_COGNITO_DOMAIN: domain.domainName,
        VITE_APP_API_URL: api.url,
        VITE_APP_REGION: scope.region,
        VITE_APP_USER_POOL_ID: auth.cognitoUserPool.userPoolId,
        VITE_APP_IDENTITY_POOL_ID: auth.cognitoCfnIdentityPool.ref,
        VITE_APP_USER_POOL_CLIENT_ID:
          auth.cognitoUserPoolClient.userPoolClientId,
      },
    });

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
      authClientId: auth.cognitoUserPoolClient.userPoolClientId,
      domain: domain.domainName,
      site_url: site.url,
    });
  }
}
