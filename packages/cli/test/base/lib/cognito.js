import { CfnOutput } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as sst from "@serverless-stack/resources";

export default class CognitoStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { bucketArn } = props;

    const stage = this.node.root.stage;
    const service = this.node.root.name;

    const userPool = new cognito.UserPool(this, "userPool", {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true }, // Set email as an alias
    });

    const userPoolClient = new cognito.UserPoolClient(this, "userPoolClient", {
      userPool,
      authFlows: { adminUserPassword: false },
      generateSecret: false,
    });

    const identityPool = new cognito.CfnIdentityPool(this, "identityPool", {
      allowUnauthenticatedIdentities: false, // Don't allow unathenticated users
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // IAM role used for authenticated users
    const authenticatedRole = new iam.Role(
      this,
      "cognitoDefaultAuthenticatedRole",
      {
        assumedBy: new iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
      }
    );
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*",
        ],
        resources: ["*"],
      })
    );
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [
          bucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
        ],
      })
    );

    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "identityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: { authenticated: authenticatedRole.roleArn },
      }
    );

    // Export values
    new CfnOutput(this, "userPoolId", {
      value: userPool.userPoolId,
    });
    new CfnOutput(this, "userPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, "identityPoolId", {
      value: identityPool.ref,
    });
    new CfnOutput(this, "authenticatedRoleName", {
      exportName: `ExtCognitoAuthRole-${stage}-${service}`,
      value: authenticatedRole.roleName,
    });
  }
}
