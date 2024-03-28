/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cognito",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const region = aws.getRegionOutput().name;

    const userPool = new aws.cognito.UserPool("MyUserPool", {
      name: `${$app.name}-${$app.stage}-MyUserPool`,
      accountRecoverySetting: {
        recoveryMechanisms: [
          {
            name: "verified_phone_number",
            priority: 1,
          },
          {
            name: "verified_email",
            priority: 2,
          },
        ],
      },
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: false,
      },
      autoVerifiedAttributes: ["email"],
      usernameAttributes: ["email"],
      usernameConfiguration: {
        caseSensitive: false,
      },
      verificationMessageTemplate: {
        defaultEmailOption: "CONFIRM_WITH_CODE",
        emailMessage: "The verification code to your new account is {####}",
        emailSubject: "Verify your new account",
        smsMessage: "The verification code to your new account is {####}",
      },
    });

    const userPoolClient = new aws.cognito.UserPoolClient("MyClient", {
      name: `${$app.name}-${$app.stage}-MyClient`,
      userPoolId: userPool.id,
      allowedOauthFlows: ["implicit", "code"],
      allowedOauthFlowsUserPoolClient: true,
      allowedOauthScopes: [
        "profile",
        "phone",
        "email",
        "openid",
        "aws.cognito.signin.user.admin",
      ],
      callbackUrls: ["https://example.com"],
      supportedIdentityProviders: ["COGNITO"],
    });

    const identityPool = new aws.cognito.IdentityPool("MyIdentityPool", {
      identityPoolName: `${$app.name}-${$app.stage}-MyIdentityPool`,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.id,
          providerName: $interpolate`cognito-idp.${region}.amazonaws.com/${userPool.id}`,
        },
      ],
    });

    const authRole = new aws.iam.Role("MyAuthRole", {
      assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            effect: "Allow",
            principals: [
              {
                type: "Federated",
                identifiers: ["cognito-identity.amazonaws.com"],
              },
            ],
            actions: ["sts:AssumeRoleWithWebIdentity"],
            conditions: [
              {
                test: "StringEquals",
                variable: "cognito-identity.amazonaws.com:aud",
                values: [identityPool.id],
              },
              {
                test: "StringEquals",
                variable: "cognito-identity.amazonaws.com:amr",
                values: ["authenticated"],
              },
            ],
          },
        ],
      }).json,
      inlinePolicies: [
        {
          name: "inline",
          policy: aws.iam.getPolicyDocumentOutput({
            version: "2012-10-17",
            statements: [
              {
                effect: "Allow",
                actions: [
                  "mobileanalytics:PutEvents",
                  "cognito-sync:*",
                  "cognito-identity:*",
                ],
                resources: ["*"],
              },
            ],
          }).json,
        },
      ],
    });
    const unauthRole = new aws.iam.Role("MyUnauthRole", {
      assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
        statements: [
          {
            effect: "Allow",
            principals: [
              {
                type: "Federated",
                identifiers: ["cognito-identity.amazonaws.com"],
              },
            ],
            actions: ["sts:AssumeRoleWithWebIdentity"],
            conditions: [
              {
                test: "StringEquals",
                variable: "cognito-identity.amazonaws.com:aud",
                values: [identityPool.id],
              },
              {
                test: "StringEquals",
                variable: "cognito-identity.amazonaws.com:amr",
                values: ["unauthenticated"],
              },
            ],
          },
        ],
      }).json,
      inlinePolicies: [
        {
          name: "inline",
          policy: aws.iam.getPolicyDocumentOutput({
            version: "2012-10-17",
            statements: [
              {
                effect: "Allow",
                actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
                resources: ["*"],
              },
            ],
          }).json,
        },
      ],
    });
    new aws.cognito.IdentityPoolRoleAttachment("MyIdentityPoolRoles", {
      identityPoolId: identityPool.id,
      roles: {
        authenticated: authRole.arn,
        unauthenticated: unauthRole.arn,
      },
    });

    return {
      Region: region,
      UserPoolId: userPool.id,
      UserPoolClientId: userPoolClient.id,
      IdentityPoolId: identityPool.id,
    };
  },
});
