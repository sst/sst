import { test, expect } from "vitest";
import { ANY, ABSENT, hasResource, countResources, countResourcesLike } from "./helper";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import {
  App,
  Stack,
  Cognito,
  CognitoAuth0Props,
  CognitoAmazonProps,
  CognitoAppleProps,
  CognitoFacebookProps,
  CognitoGoogleProps,
  CognitoTwitterProps,
  Function,
  Bucket,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*"
};

///////////////////
// Test Constructor
///////////////////

test("cdk.userPool is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Cognito(stack, "Auth", {});

  expect(auth.cognitoIdentityPoolId).toBeDefined();

  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "dev-my-app-Auth",
    AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
    AutoVerifiedAttributes: ABSENT,
    UsernameAttributes: ABSENT,
    UsernameConfiguration: { CaseSensitive: false }
  });
  hasResource(stack, "AWS::Cognito::UserPoolClient", {
    UserPoolId: { Ref: "AuthUserPool8115E87F" },
    AllowedOAuthFlows: ["implicit", "code"]
  });
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    IdentityPoolName: "dev-my-app-Auth",
    AllowUnauthenticatedIdentities: true,
    CognitoIdentityProviders: [
      {
        ClientId: { Ref: "AuthUserPoolClient0AA456E4" },
        ProviderName: {
          "Fn::Join": [
            "",
            [
              "cognito-idp.us-east-1.",
              { Ref: "AWS::URLSuffix" },
              "/",
              { Ref: "AuthUserPool8115E87F" }
            ]
          ]
        }
      }
    ],
    SupportedLoginProviders: {}
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
                Ref: "AuthIdentityPool12DFB5E1"
              }
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated"
            }
          },
          Effect: "Allow",
          Principal: {
            Federated: "cognito-identity.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
  hasResource(stack, "AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": {
                Ref: "AuthIdentityPool12DFB5E1"
              }
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "unauthenticated"
            }
          },
          Effect: "Allow",
          Principal: {
            Federated: "cognito-identity.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("cdk.userPool is prop", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    cdk: {
      userPool: {
        mfa: cognito.Mfa.OPTIONAL
      },
      userPoolClient: {
        disableOAuth: true
      }
    }
  });
  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "dev-my-app-Auth",
    AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
    MfaConfiguration: "OPTIONAL",
    UsernameAttributes: ABSENT,
    UsernameConfiguration: { CaseSensitive: false }
  });
  hasResource(stack, "AWS::Cognito::UserPoolClient", {
    UserPoolId: { Ref: "AuthUserPool8115E87F" },
    AllowedOAuthFlows: ABSENT
  });
});

test("cdk.userPool is construct", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool"
  });
  new Cognito(stack, "Auth", {
    cdk: {
      userPool
    }
  });
  countResources(stack, "AWS::Cognito::UserPool", 1);
  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "user-pool"
  });
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
});

test("cdk.userPoolClient is construct", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool"
  });
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
    disableOAuth: true
  });
  new Cognito(stack, "Auth", {
    cdk: {
      userPool,
      userPoolClient
    }
  });
  countResources(stack, "AWS::Cognito::UserPool", 1);
  hasResource(stack, "AWS::Cognito::UserPool", {
    UserPoolName: "user-pool"
  });
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
  hasResource(stack, "AWS::Cognito::UserPoolClient", {
    AllowedOAuthFlows: ABSENT
  });
});

test("cdk.userPool is prop and cdk.userPoolClient is construct", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool", {
    userPoolName: "user-pool"
  });
  const userPoolClient = new cognito.UserPoolClient(stack, "UserPoolClient", {
    userPool,
    disableOAuth: true
  });
  expect(() => {
    new Cognito(stack, "Auth", {
      cdk: {
        userPool: { mfa: cognito.Mfa.OPTIONAL },
        userPoolClient
      }
    });
  }).toThrow(
    /Cannot import the "userPoolClient" when the "userPool" is not imported./
  );
});

test("cdk.userPool is imported by userPoolName", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    cdk: {
      userPool: cognito.UserPool.fromUserPoolId(stack, "IPool", "my-user-pool")
    }
  });
  countResources(stack, "AWS::Cognito::UserPool", 0);
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    IdentityPoolName: "dev-my-app-Auth",
    AllowUnauthenticatedIdentities: true,
    CognitoIdentityProviders: [
      {
        ClientId: { Ref: "AuthUserPoolClient0AA456E4" },
        ProviderName: {
          "Fn::Join": [
            "",
            [
              "cognito-idp.us-east-1.",
              { Ref: "AWS::URLSuffix" },
              "/my-user-pool"
            ]
          ]
        }
      }
    ],
    SupportedLoginProviders: {}
  });
});

test("cdk.userPool is imported by userPoolName with triggers", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      cdk: {
        userPool: cognito.UserPool.fromUserPoolId(
          stack,
          "IPool",
          "my-user-pool"
        )
      },
      triggers: {
        createAuthChallenge: "test/lambda.handler"
      }
    });
  }).toThrow(/Cannot add triggers when the "userPool" is imported./);
});

test("login is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth");
  hasResource(stack, "AWS::Cognito::UserPool", {
    AutoVerifiedAttributes: ABSENT,
    UsernameAttributes: ABSENT,
    UsernameConfiguration: { CaseSensitive: false }
  });
});

test("login is email", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    login: ["email"]
  });
  hasResource(stack, "AWS::Cognito::UserPool", {
    AutoVerifiedAttributes: ["email"],
    UsernameAttributes: ["email"],
    UsernameConfiguration: { CaseSensitive: false }
  });
});

test("triggers is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {});
  countResources(stack, "AWS::Lambda::Function", 0);
  hasResource(stack, "AWS::Cognito::UserPool", {
    LambdaConfig: ABSENT
  });
});

test("triggers is empty", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    triggers: {}
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  hasResource(stack, "AWS::Cognito::UserPool", {
    LambdaConfig: ABSENT
  });
});

test("triggers is string", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler"
    }
  });
  hasResource(stack, "AWS::Cognito::UserPool", {
    LambdaConfig: {
      CreateAuthChallenge: {
        "Fn::GetAtt": ["AuthcreateAuthChallenge7103E837", "Arn"]
      }
    }
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
});

test("triggers is string with defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler"
    },
    defaults: {
      function: {
        timeout: 3,
        environment: {
          keyA: "valueA"
        }
      }
    }
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 3,
    Environment: {
      Variables: {
        keyA: "valueA",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test("triggers is Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: f
    }
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
});

test("triggers is Function with defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Cognito(stack, "Auth", {
      triggers: {
        createAuthChallenge: f
      },
      defaults: {
        function: {
          timeout: 3
        }
      }
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("triggers is FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: {
        handler: "test/lambda.handler"
      }
    }
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
});

test("triggers is FunctionProps with defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: {
        handler: "test/lambda.handler"
      }
    },
    defaults: {
      function: {
        timeout: 3
      }
    }
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 3
  });
});

test("triggers is redefined error", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Cognito(stack, "Auth", {
      triggers: {
        createAuthChallenge: "test/lambda.handler"
      },
      cdk: {
        userPool: {
          lambdaTriggers: {
            customMessage: f
          }
        }
      }
    });
  }).toThrow(/Cannot configure the "cdk.userPool.lambdaTriggers"/);
});

test("identityPoolFederation auth0", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    identityPoolFederation: {
      auth0: { domain: "https://domain", clientId: "id" }
    }
  });
  countResources(stack, "AWS::Cognito::UserPool", 1);
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
  countResources(stack, "AWS::IAM::Role", 3);
  hasResource(stack, "Custom::AWSCDKOpenIdConnectProvider", {
    Url: "https://domain",
    ClientIDList: ["id"]
  });
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    IdentityPoolName: "dev-my-app-Auth",
    AllowUnauthenticatedIdentities: true,
    OpenIdConnectProviderARNs: [{ Ref: "AuthAuth0Provider57F70580" }],
    CognitoIdentityProviders: [
      {
        ClientId: { Ref: "AuthUserPoolClient0AA456E4" },
        ProviderName: {
          "Fn::Join": [
            "",
            [
              "cognito-idp.us-east-1.",
              { Ref: "AWS::URLSuffix" },
              "/",
              { Ref: "AuthUserPool8115E87F" }
            ]
          ]
        }
      }
    ]
  });
});
test("identityPoolFederation auth0-domain-without-https", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    identityPoolFederation: {
      auth0: { domain: "domain", clientId: "id" }
    }
  });
  hasResource(stack, "Custom::AWSCDKOpenIdConnectProvider", {
    Url: "https://domain",
    ClientIDList: ["id"]
  });
});

test("identityPoolFederation auth0-error-missing-domain", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        auth0: { clientId: "s" } as CognitoAuth0Props
      }
    });
  }).toThrow(/Auth0Domain/);
});

test("identityPoolFederation auth0-error-missing-clientId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        auth0: { domain: "https://domain" } as CognitoAuth0Props
      }
    });
  }).toThrow(/Auth0ClientId/);
});

test("identityPoolFederation amazon-error-missing-appId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        amazon: {} as CognitoAmazonProps
      }
    });
  }).toThrow(/AmazonAppId/);
});

test("identityPoolFederation facebook-error-missing-appId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        facebook: {} as CognitoFacebookProps
      }
    });
  }).toThrow(/FacebookAppId/);
});

test("identityPoolFederation google-error-missing-clientId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        google: {} as CognitoGoogleProps
      }
    });
  }).toThrow(/GoogleClientId/);
});

test("identityPoolFederation twitter-error-missing-consumerKey", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        twitter: { consumerSecret: "secret" } as CognitoTwitterProps
      }
    });
  }).toThrow(/TwitterConsumerKey/);
});

test("identityPoolFederation twitter-error-missing-consumerSecret", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        twitter: { consumerKey: "key" } as CognitoTwitterProps
      }
    });
  }).toThrow(/TwitterConsumerSecret/);
});

test("identityPoolFederation apple-error-missing-servicesId", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cognito(stack, "Auth", {
      identityPoolFederation: {
        apple: {} as CognitoAppleProps
      }
    });
  }).toThrow(/AppleServicesId/);
});

test("multi-social", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    identityPoolFederation: {
      amazon: { appId: "1" },
      apple: { servicesId: "2" },
      facebook: { appId: "3" },
      google: { clientId: "4" }
    }
  });
  countResources(stack, "AWS::Cognito::UserPool", 1);
  countResources(stack, "AWS::Cognito::UserPoolClient", 1);
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    SupportedLoginProviders: {
      "www.amazon.com": "1",
      "appleid.apple.com": "2",
      "graph.facebook.com": "3",
      "accounts.google.com": "4"
    }
  });
});

test("identity-pool-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Cognito(stack, "Auth", {
    identityPoolFederation: {
      cdk: {
        cfnIdentityPool: {
          allowUnauthenticatedIdentities: false
        }
      }
    }
  });
  hasResource(stack, "AWS::Cognito::IdentityPool", {
    IdentityPoolName: "dev-my-app-Auth",
    AllowUnauthenticatedIdentities: false
  });
});

///////////////////
// Test Methods
///////////////////

test("getFunction", async () => {
  const stack = new Stack(new App(), "stack");
  const ret = new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler"
    }
  });
  expect(ret.getFunction("createAuthChallenge")).toBeDefined();
});

test("getFunction-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const ret = new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler"
    }
  });
  expect(ret.getFunction("customMessage")).toBeUndefined();
});

test("attachPermissionsForTrigger", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler",
      customMessage: "test/lambda.handler"
    }
  });
  auth.attachPermissionsForTrigger("createAuthChallenge", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    },
    PolicyName: "AuthcreateAuthChallengeServiceRoleDefaultPolicy5BD25E0B"
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17"
    },
    PolicyName: "AuthcustomMessageServiceRoleDefaultPolicyDD31678C"
  });
});

test("attachPermissionsForTriggers", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler",
      customMessage: "test/lambda.handler"
    }
  });
  auth.attachPermissionsForTriggers(["s3"]);
  countResourcesLike(stack, "AWS::IAM::Policy", 2, {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    },
  });
});

test("bindForTrigger", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const auth = new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler",
      customMessage: "test/lambda.handler"
    }
  });
  auth.bindForTrigger("createAuthChallenge", [bucket]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: ANY }
      ],
      Version: "2012-10-17"
    },
    PolicyName: "AuthcreateAuthChallengeServiceRoleDefaultPolicy5BD25E0B"
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17"
    },
    PolicyName: "AuthcustomMessageServiceRoleDefaultPolicyDD31678C"
  });
});

test("bindForTriggers", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const auth = new Cognito(stack, "Auth", {
    triggers: {
      createAuthChallenge: "test/lambda.handler",
      customMessage: "test/lambda.handler"
    }
  });
  auth.bindForTriggers([bucket]);
  countResourcesLike(stack, "AWS::IAM::Policy", 2, {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: ANY }
      ],
      Version: "2012-10-17"
    },
  });
});

test("attachPermissionsForAuthUsers: without scope (deprecated)", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForAuthUsers([
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "mobileanalytics:PutEvents",
            "cognito-sync:*",
            "cognito-identity:*"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissionsForAuthUsers: with scope same stack", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForAuthUsers(stack, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "mobileanalytics:PutEvents",
            "cognito-sync:*",
            "cognito-identity:*"
          ],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissionsForAuthUsers: with scope diff stack", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForAuthUsers(stack2, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "mobileanalytics:PutEvents",
            "cognito-sync:*",
            "cognito-identity:*"
          ],
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
  hasResource(stack2, "AWS::IAM::Policy", {
    PolicyName: "AuthAuthdevmyappstack2AuthRole2467F67E",
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    },
    Roles: [{ "Fn::ImportValue": ANY }]
  });
});

test("attachPermissionsForAuthUsers: with scope diff stack multiple calls", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForAuthUsers(stack2, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  auth.attachPermissionsForAuthUsers(stack2, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack2, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "dynamodb:*",
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    },
    Roles: [{ "Fn::ImportValue": ANY }]
  });
});

test("attachPermissionsForUnauthUsers: without scope (deprecated)", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForUnauthUsers([
    new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: ["mobileanalytics:PutEvents", "cognito-sync:*"],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "s3:*",
          Effect: "Deny",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissionsForUnauthUsers: with scope same stack", async () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForUnauthUsers(stack, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: ["mobileanalytics:PutEvents", "cognito-sync:*"],
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissionsForUnauthUsers: with scope diff stack", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForUnauthUsers(stack2, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: ["mobileanalytics:PutEvents", "cognito-sync:*"],
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    }
  });
  hasResource(stack2, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    },
    Roles: [{ "Fn::ImportValue": ANY }]
  });
});

test("attachPermissionsForUnauthUsers: with scope diff stack multiple calls", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const stack2 = new Stack(app, "stack2");
  const auth = new Cognito(stack, "Auth", {});
  auth.attachPermissionsForUnauthUsers(stack2, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:*"],
      resources: ["*"]
    })
  ]);
  auth.attachPermissionsForUnauthUsers(stack2, [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:*"],
      resources: ["*"]
    })
  ]);
  hasResource(stack2, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: "*"
        },
        {
          Action: "dynamodb:*",
          Effect: "Allow",
          Resource: "*"
        }
      ],
      Version: "2012-10-17"
    },
    Roles: [{ "Fn::ImportValue": ANY }]
  });
});