import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

import { Stack, Api } from "@serverless-stack/resources";

export default class ApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { tableName } = props;

    // Create API
    const srcPath = 'services/notes';
    const handler = 'main';
    const environment = { tableName };
    const initialPolicy = [ new iam.PolicyStatement({
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
    }) ];

    const api = new Api(this, "Api", {
      routes: {
        "GET /notes": "path/to/file.main",
      },
    });

    const api = new Api(this, "Api", {
      defaultLambdaProps: {
        srcPath: 'services/notes',
        environment: { tableName },
        initialPolicy: [ new iam.PolicyStatement({
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
        }) ];
      },
      defaultAuthorizationType: 'AWS_IAM',
      routes: {
        "GET /": "path/to/list.main",
        "GET /notes": "path/to/get.main",
      },
    });

    const api = new Api(this, "Api", {
      routes: {
        "GET /notes": {
          authorizationType: "AWS_IAM",
          lambdaProps: { srcPath, handler: "path/to/list.main", environment, initialPolicy },
        },
        {
          path: "/notes",
          method: "POST",
          authorizationType: "AWS_IAM",
          lambdaProps: { srcPath, entry: "create.js", handler, environment, initialPolicy },
        },
        {
          path: "/notes/{id}",
          method: "GET",
          authorizationType: "AWS_IAM",
          lambdaProps: { srcPath, entry: "get.js", handler, environment, initialPolicy },
        },
        {
          path: "/notes/{id}",
          method: "PUT",
          authorizationType: "AWS_IAM",
          lambdaProps: { srcPath, entry: "update.js", handler, environment, initialPolicy },
        },
        {
          path: "/notes/{id}",
          method: "DELETE",
          authorizationType: "AWS_IAM",
          lambdaProps: { srcPath, entry: "delete.js", handler, environment, initialPolicy },
        },
      },
    });
  }
}
