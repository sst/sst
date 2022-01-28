import { CfnOutput } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sst from "@serverless-stack/resources";

export default class CognitoStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { api, bucket } = props;

    const { account, region } = sst.Stack.of(this);

    const auth = new sst.Auth(this, "Auth", {
      cognito: {
        signInAliases: { email: true },
      },
      facebook: { appId: "419718329085013" },
      google: {
        clientId:
          "38017095028-abcdjaaaidbgt3kfhuoh3n5ts08vodt2.apps.googleusercontent.com",
      },
    });
    auth.attachPermissionsForAuthUsers([
      // IAM policy granting users permission to a specific folder in the S3 bucket
      new iam.PolicyStatement({
        actions: ["s3:*"],
        effect: iam.Effect.ALLOW,
        resources: [
          bucket.bucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
        ],
      }),
      // IAM policy granting users permission to invoke the API
      new iam.PolicyStatement({
        actions: ["execute-api:Invoke"],
        effect: iam.Effect.ALLOW,
        resources: [
          `arn:aws:execute-api:${region}:${account}:${api.httpApiId}/*`,
        ],
      }),
    ]);

    // Export values
    new CfnOutput(this, "UserPoolId", {
      value: auth.cognitoUserPool.userPoolId,
    });
    new CfnOutput(this, "UserPoolClientId", {
      value: auth.cognitoUserPoolClient.userPoolClientId,
    });
    new CfnOutput(this, "IdentityPoolId", {
      value: auth.cognitoCfnIdentityPool.ref,
    });
  }
}
