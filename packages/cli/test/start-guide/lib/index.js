import S3Stack from "./S3Stack";
import CognitoStack from "./CognitoStack";
import DynamoDBStack from "./DynamoDBStack";
import ApiStack from "./ApiStack";
import * as iam from "@aws-cdk/aws-iam";

// Add stacks
export default function main(app) {
  const dbStack = new DynamoDBStack(app, "dynamodb");

  const s3Stack = new S3Stack(app, "s3");

  const apiStack = new ApiStack(app, "api", {
    tableName: dbStack.table.tableName,
  });

  new CognitoStack(app, "cognito", {
    apiId: apiStack.api.httpApiId,
    bucketArn: s3Stack.bucket.bucketArn,
  });
}
