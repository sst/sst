import S3Stack from "./S3Stack";
import CognitoStack from "./CognitoStack";
import DynamoDBStack from "./DynamoDBStack";
import ApiStack from "./ApiStack";

// Add stacks
export default function main(app) {
  const dbStack = new DynamoDBStack(app, "dynamodb");

  const s3Stack = new S3Stack(app, "s3");

  const apiStack = new ApiStack(app, "api", {
    tableName: dbStack.table.tableName,
    tableArn: dbStack.table.tableArn,
  });

  new CognitoStack(app, "cognito", {
    apiId: apiStack.httpApi.httpApiId,
    bucketArn: s3Stack.bucket.bucketArn,
  });
}
