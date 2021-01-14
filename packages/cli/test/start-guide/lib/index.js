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
    routes: [
      // PATH         , METHOD    , srcPath         , entry       , handler, AUTH      ],
      [ "/notes"      , "GET"     , "services/notes", "list.js"   , "main" , "aws_iam" ],
      [ "/notes"      , "POST"    , "services/notes", "create.js" , "main" , "aws_iam" ],
      [ "/notes/{id}" , "GET"     , "services/notes", "get.js"    , "main" , "aws_iam" ],
      [ "/notes/{id}" , "PUT"     , "services/notes", "update.js" , "main" , "aws_iam" ],
      [ "/notes/{id}" , "DELETE"  , "services/notes", "delete.js" , "main" , "aws_iam" ],
    ],
    cors: true,
    //memory: 1024,
    //timeout: 20,
    environment: {
      tableName: dbStack.table.tableName,
    },
    policyStatements: [{
      actions: [
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:DescribeTable",
      ],
      effect: iam.Effect.ALLOW,
      resources: [ dbStack.table.tableArn ],
    }],
  });

  new CognitoStack(app, "cognito", {
    apiId: apiStack.api.httpApiId,
    bucketArn: s3Stack.bucket.bucketArn,
  });
}
