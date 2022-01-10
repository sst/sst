import {
  ABSENT,
  hasResource,
  countResources,
} from "./helper";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import {
  App,
  Stack,
  Auth,
  AuthAuth0Props,
  AuthAmazonProps,
  AuthAppleProps,
  AuthFacebookProps,
  AuthGoogleProps,
  AuthTwitterProps,
  Function,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("cognito-true", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "Auth", {
    cognito: true,
  });

  expect(auth.cognitoIdentityPoolId).toBeDefined();

  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "dev-my-app-Auth",
    AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
    AutoVerifiedAttributes: ABSENT,
    UsernameAttributes: ABSENT,
    UsernameConfiguration: { CaseSensitive: false },
  });
  hasResource(stack, "AWS::Cognito::UserPoolClient", {
    UserPoolId: { Ref: "AuthUserPool8115E87F" },
    AllowedOAuthFlows: ["implicit", "code"],
  });
  hasResource(stack, "AWS::Cognito::IdentityPool", {
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
  });
  countResources(stack, "AWS::IAM::Role", 2);
  hasResource(stack, "AWS::IAM::Role", {
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
  });
  hasResource(stack, "AWS::IAM::Role", {
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
  });
});

test("cognito-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: {
      userPool: {
        signInAliases: { email: true },
      },
      userPoolClient: {
        disableOAuth: true,
      },
    },
  });
  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "dev-my-app-Auth",
    AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
    AutoVerifiedAttributes: ["email"],
    UsernameAttributes: ["email"],
    UsernameConfiguration: { CaseSensitive: false },
  });
  hasResource(stack, "AWS::Cognito::UserPoolClient", {
    UserPoolId: { Ref: "AuthUserPool8115E87F" },
    AllowedOAuthFlows: ABSENT,
  });
});

test("cognito-userPool-imported", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  new Auth(stack, "Auth", {
    cognito: { userPool },
  });
  countResources(stack, "AWS::Cognito::UserPool", 1);
  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "user-pool",
  });
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
});

test("cognito-userPoolClient-imported", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
    disableOAuth: true,
  });
  new Auth(stack, "Auth", {
    cognito: { userPool, userPoolClient },
  });
  countResources(stack, "AWS::Cognito::UserPool", 1);
  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "user-pool",
  });
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
  hasResource(stack, "AWS::Cognito::UserPoolClient", {
    AllowedOAuthFlows: ABSENT,
  });
});

test("cognito-userPool-not-imported-userPoolClient-imported", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
    disableOAuth: true,
  });
  expect(() => {
    new Auth(stack, "Auth", {
      cognito: {
        userPool: { signInAliases: { email: true } },
        userPoolClient,
      },
    });
  }).toThrow(
    /Cannot import the "userPoolClient" when the "userPool" is not imported./
  );
});

test("cognito-deprecated-signInAliases", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", {
      cognito: {
        signInAliases: { email: true },
      },
    });
  }).toThrow(/The "cognito.signInAliases" property is deprecated./);
});

test("cognito-deprecated-user-pool", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool",
  });
  expect(() => {
    new Auth(stack, "Auth", {
      cognitoUserPool: userPool,
    });
  }).toThrow(/The "cognitoUserPool" property is deprecated./);
});

test("cognito-deprecated-user-pool-client", async () => {
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
  }).toThrow(/The "cognitoUserPoolClient" property is deprecated./);
});

test("cognito-triggers-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", { cognito: true });
  countResources(stack, "AWS::Lambda::Function", 0);
  hasResource(stack, "AWS::Cognito::UserPool", {
    LambdaConfig: ABSENT,
  });
});

test("cognito-triggers-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: {
      triggers: {},
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  hasResource(stack, "AWS::Cognito::UserPool", {
    LambdaConfig: ABSENT,
  });
});

test("cognito-triggers-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: "test/lambda.handler",
      },
    },
  });
  hasResource(stack, "AWS::Cognito::UserPool", {
    LambdaConfig: {
      CreateAuthChallenge: {
        "Fn::GetAtt": ["AuthcreateAuthChallenge7103E837", "Arn"],
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("cognito-triggers-string-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: "test/lambda.handler",
      },
      defaultFunctionProps: {
        timeout: 3,
        environment: {
          keyA: "valueA",
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
    Environment: {
      Variables: {
        keyA: "valueA",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("cognito-triggers-Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: f,
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("cognito-triggers-Function-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Auth(stack, "Auth", {
      cognito: {
        triggers: {
          createAuthChallenge: f,
        },
        defaultFunctionProps: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/The "defaultFunctionProps" cannot be applied/);
});

test("cognito-triggers-FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: {
          handler: "test/lambda.handler",
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("cognito-triggers-FunctionProps-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: {
          handler: "test/lambda.handler",
        },
      },
      defaultFunctionProps: {
        timeout: 3,
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("cognito-triggers-redefined-error", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Auth(stack, "Auth", {
      cognito: {
        triggers: {
          createAuthChallenge: "test/lambda.handler",
        },
        userPool: {
          lambdaTriggers: {
            customMessage: f,
          },
        },
      },
    });
  }).toThrow(/Cannot configure the "cognito.userPool.lambdaTriggers"/);
});

test("auth0", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    auth0: { domain: "https://domain", clientId: "id" },
  });
  countResources(stack, "AWS::Cognito::UserPool", 0);
  countResources(stack, "AWS::Cognito::UserPoolClient", 0);
  countResources(stack, "AWS::IAM::Role", 3);
  hasResource(stack, "Custom::AWSCDKOpenIdConnectProvider", {
    Url: "https://domain",
    ClientIDList: ["id"],
  });
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    IdentityPoolName: "dev-my-app-Auth",
    AllowUnauthenticatedIdentities: true,
    OpenIdConnectProviderARNs: [{ Ref: "AuthAuth0Provider57F70580" }],
  });
});

test("auth0-domain-without-https", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    auth0: { domain: "domain", clientId: "id" },
  });
  hasResource(stack, "Custom::AWSCDKOpenIdConnectProvider", {
    Url: "https://domain",
    ClientIDList: ["id"],
  });
});

test("auth0-error-missing-domain", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", {
      auth0: { clientId: "s" } as AuthAuth0Props,
    });
  }).toThrow(/No Auth0 domain/);
});

test("auth0-error-missing-clientId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", {
      auth0: { domain: "https://domain" } as AuthAuth0Props,
    });
  }).toThrow(/No Auth0 clientId/);
});

test("amazon-error-missing-appId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { amazon: {} as AuthAmazonProps });
  }).toThrow(/No Amazon/);
});

test("facebook-error-missing-appId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { facebook: {} as AuthFacebookProps });
  }).toThrow(/No Facebook/);
});

test("google-error-missing-clientId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { google: {} as AuthGoogleProps });
  }).toThrow(/No Google/);
});

test("twitter-error-missing-consumerKey", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", {
      twitter: { consumerSecret: "secret" } as AuthTwitterProps,
    });
  }).toThrow(/No Twitter consumer key/);
});

test("twitter-error-missing-consumerSecret", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", {
      twitter: { consumerKey: "key" } as AuthTwitterProps,
    });
  }).toThrow(/No Twitter consumer secret/);
});

test("apple-error-missing-servicesId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Auth(stack, "Auth", { apple: {} as AuthAppleProps });
  }).toThrow(/No Apple/);
});

test("cognito-and-social", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    cognito: true,
    twitter: { consumerKey: "k", consumerSecret: "s" },
  });
  countResources(stack, "AWS::Cognito::UserPool", 1);
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
  countResources(stack, "AWS::IAM::Role", 2);
  hasResource(stack, "AWS::Cognito::IdentityPool", {
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
  });
});

test("multi-social", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    amazon: { appId: "1" },
    apple: { servicesId: "2" },
    facebook: { appId: "3" },
    google: { clientId: "4" },
  });
  countResources(stack, "AWS::Cognito::UserPool", 0);
  countResources(stack, "AWS::Cognito::UserPoolClient", 0);
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    SupportedLoginProviders: {
      "www.amazon.com": "1",
      "appleid.apple.com": "2",
      "graph.facebook.com": "3",
      "accounts.google.com": "4",
    },
  });
});

test("identity-pool-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Auth(stack, "Auth", {
    identityPool: {
      allowUnauthenticatedIdentities: false,
    },
  });
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    IdentityPoolName: "dev-my-app-Auth",
    AllowUnauthenticatedIdentities: false,
  });
});

///////////////////
// Test Methods
///////////////////

test("getFunction", async () => {
  const stack = new Stack(new App(), "stack");
  const ret = new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: "test/lambda.handler",
      },
    },
  });
  expect(ret.getFunction("createAuthChallenge")).toBeDefined();
});

test("getFunction-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const ret = new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: "test/lambda.handler",
      },
    },
  });
  expect(ret.getFunction("customMessage")).toBeUndefined();
});

test("attachPermissionsForTrigger", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: "test/lambda.handler",
        customMessage: "test/lambda.handler",
      },
    },
  });
  auth.attachPermissionsForTrigger("createAuthChallenge", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "AuthcreateAuthChallengeServiceRoleDefaultPolicy5BD25E0B",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "AuthcustomMessageServiceRoleDefaultPolicyDD31678C",
  });
});

test("attachPermissionsForTriggers", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "Auth", {
    cognito: {
      triggers: {
        createAuthChallenge: "test/lambda.handler",
        customMessage: "test/lambda.handler",
      },
    },
  });
  auth.attachPermissionsForTriggers(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "AuthcreateAuthChallengeServiceRoleDefaultPolicy5BD25E0B",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "AuthcustomMessageServiceRoleDefaultPolicyDD31678C",
  });
});

test("attachPermissionsForAuthUsers", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "Auth", {
    cognito: true,
  });
  auth.attachPermissionsForAuthUsers([
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
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
  });
});

test("attachPermissionsForUnauthUsers", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "Auth", {
    cognito: true,
  });
  auth.attachPermissionsForUnauthUsers([
    new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ["s3:*"],
      resources: ["*"],
    }),
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
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
  });
});
