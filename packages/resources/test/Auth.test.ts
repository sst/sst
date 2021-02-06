import {
  expect as expectCdk,
  haveResource,
  countResources,
} from "@aws-cdk/assert";
import * as iam from "@aws-cdk/aws-iam";
import * as cognito from "@aws-cdk/aws-cognito";
import {
  App,
  Stack,
  Auth,
  AuthCognitoProps,
  AuthAmazonProps,
  AuthAppleProps,
  AuthFacebookProps,
  AuthGoogleProps,
  AuthTwitterProps,
} from "../src";

test("usecase-cognito-sign-in-with-email", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: {
      signInAliases: { email: true },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Cognito::UserPool", {
      UserPoolName: "dev-my-app-Auth",
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
      AutoVerifiedAttributes: ["email"],
      UsernameAttributes: ["email"],
      UsernameConfiguration: { CaseSensitive: false },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Cognito::UserPoolClient", {
      UserPoolId: { Ref: "AuthUserPool8115E87F" },
      AllowedOAuthFlows: ["implicit", "code"],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Cognito::IdentityPool", {
      IdentityPoolName: "dev-my-app-Auth",
      AllowUnauthenticatedIdentities: true,
      CognitoIdentityProviders: [
        {
          ClientId: { Ref: "AuthUserPoolClient0AA456E4" },
          ProviderName: {
            "Fn::GetAtt": ["AuthUserPool8115E87F", "ProviderName"],
          },
        },
      ],
      SupportedLoginProviders: {},
    })
  );
  expectCdk(stack).to(countResources("AWS::IAM::Role", 2));
  expectCdk(stack).to(
    haveResource("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "cognito-identity.amazonaws.com:aud": {
                  Ref: "AuthIdentityPool12DFB5E1",
                },
              },
              "ForAnyValue:StringLike": {
                "cognito-identity.amazonaws.com:amr": "authenticated",
              },
            },
            Effect: "Allow",
            Principal: {
              Federated: "cognito-identity.amazonaws.com",
            },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "cognito-identity.amazonaws.com:aud": {
                  Ref: "AuthIdentityPool12DFB5E1",
                },
              },
              "ForAnyValue:StringLike": {
                "cognito-identity.amazonaws.com:amr": "unauthenticated",
              },
            },
            Effect: "Allow",
            Principal: {
              Federated: "cognito-identity.amazonaws.com",
            },
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("usecase-cognito-and-social", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: { signInAliases: { email: true } },
    twitter: { consumerKey: "k", consumerSecret: "s" },
  });
  expectCdk(stack).to(countResources("AWS::Cognito::UserPool", 1));
  expectCdk(stack).to(countResources("AWS::Cognito::UserPoolClient", 1));
  expectCdk(stack).to(countResources("AWS::IAM::Role", 2));
  expectCdk(stack).to(
    haveResource("AWS::Cognito::IdentityPool", {
      IdentityPoolName: "dev-my-app-Auth",
      AllowUnauthenticatedIdentities: true,
      CognitoIdentityProviders: [
        {
          ClientId: { Ref: "AuthUserPoolClient0AA456E4" },
          ProviderName: {
            "Fn::GetAtt": ["AuthUserPool8115E87F", "ProviderName"],
          },
        },
      ],
      SupportedLoginProviders: { "api.twitter.com": "k;s" },
    })
  );
});

test("usecase-multi-social", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    amazon: { appId: "1" },
    apple: { servicesId: "2" },
    facebook: { appId: "3" },
    google: { clientId: "4" },
  });
  expectCdk(stack).to(countResources("AWS::Cognito::UserPool", 0));
  expectCdk(stack).to(countResources("AWS::Cognito::UserPoolClient", 0));
  expectCdk(stack).to(
    haveResource("AWS::Cognito::IdentityPool", {
      SupportedLoginProviders: {
        "www.amazon.com": "1",
        "appleid.apple.com": "2",
        "graph.facebook.com": "3",
        "accounts.google.com": "4",
      },
    })
  );
});

test("usecase-cognito-user-pool", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
  });
  new Auth(stack, "Auth", {
    cognitoUserPool: userPool,
    cognitoUserPoolClient: userPoolClient,
  });
  expectCdk(stack).to(
    haveResource("AWS::Cognito::UserPool", {
      UserPoolName: "user-pool",
    })
  );
  expectCdk(stack).to(countResources("AWS::Cognito::UserPoolClient", 1));
  expectCdk(stack).to(countResources("AWS::IAM::Role", 2));
  expectCdk(stack).to(
    haveResource("AWS::Cognito::IdentityPool", {
      IdentityPoolName: "dev-my-app-Auth",
    })
  );
});

test("usecase-attach-permissions-for-auth-users", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "Auth", {
    cognito: { signInAliases: { email: true } },
  });
  auth.attachPermissionsForAuthUsers([
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              "mobileanalytics:PutEvents",
              "cognito-sync:*",
              "cognito-identity:*",
            ],
            Effect: "Allow",
            Resource: "*",
          },
          {
            Action: "s3:*",
            Effect: "Allow",
            Resource: "*",
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("usecase-attach-permissions-for-unauth-users", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "Auth", {
    cognito: { signInAliases: { email: true } },
  });
  auth.attachPermissionsForUnauthUsers([
    new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: ["mobileanalytics:PutEvents", "cognito-sync:*"],
            Effect: "Allow",
            Resource: "*",
          },
          {
            Action: "s3:*",
            Effect: "Deny",
            Resource: "*",
          },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("error-cognito-user-pool-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  expect(() => {
    new Auth(stack, "Auth", {
      cognito: { signInAliases: { email: true } },
      cognitoUserPool: userPool,
    });
  }).toThrow(/Cannot define both cognito and cognitoUserPool/);
});

test("error-cognito-user-pool-client-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
  });
  expect(() => {
    new Auth(stack, "Auth", {
      cognito: { signInAliases: { email: true } },
      cognitoUserPoolClient: userPoolClient,
    });
  }).toThrow(/Cannot define both cognito and cognitoUserPoolClient/);
});

test("error-cognito-user-pool-not-defined", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  expect(() => {
    new Auth(stack, "Auth", {
      cognitoUserPool: userPool,
    });
  }).toThrow(/Have to define both cognitoUserPool and cognitoUserPoolClient/);
});

test("error-cognito-user-pool-client-not-defined", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
  });
  expect(() => {
    new Auth(stack, "Auth", {
      cognitoUserPoolClient: userPoolClient,
    });
  }).toThrow(/Have to define both cognitoUserPool and cognitoUserPoolClient/);
});

test("error-cognito-missing-signInAliases", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { cognito: {} as AuthCognitoProps });
  }).toThrow(/No signInAliases defined for cognito/);
});

test("error-amazon-missing-appId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { amazon: {} as AuthAmazonProps });
  }).toThrow(/No Amazon/);
});

test("error-facebook-missing-appId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { facebook: {} as AuthFacebookProps });
  }).toThrow(/No Facebook/);
});

test("error-google-missing-clientId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { google: {} as AuthGoogleProps });
  }).toThrow(/No Google/);
});

test("error-twitter-missing-consumerKey", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", {
      twitter: { consumerSecret: "secret" } as AuthTwitterProps,
    });
  }).toThrow(/No Twitter consumer key/);
});

test("error-twitter-missing-consumerSecret", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", {
      twitter: { consumerKey: "key" } as AuthTwitterProps,
    });
  }).toThrow(/No Twitter consumer secret/);
});

test("error-apple-missing-servicesId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { apple: {} as AuthAppleProps });
  }).toThrow(/No Apple/);
});
