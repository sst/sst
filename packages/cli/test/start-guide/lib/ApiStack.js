import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

import * as sst from "@serverless-stack/resources";

export default class ApiStack extends sst.Stack {

  httpApi;

  constructor(scope, id, props) {
    super(scope, id, props);

    const { tableName, tableArn } = props;

    // Create API
    const apiRet = new sst.Api(this, "Api", {
      routes: {
        "GET    /notes": "list.main",
        "POST   /notes": "create.main",
        "GET    /notes/{id}": "get.main",
        "PUT    /notes/{id}": "update.main",
        "DELETE /notes/{id}": "delete.main",
      },
      defaultAuthorizationType: 'AWS_IAM',
      defaultFunctionProps: {
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
          resources: [ tableArn ],
        }) ]
      },
    });
    this.httpApi = apiRet.httpApi;

    // set API endpoint as stack output
    new cdk.CfnOutput(this, `ApiEndpoint`, {
      value: this.httpApi.apiEndpoint,
    });

    // set log group name as stack output
    new cdk.CfnOutput(this, `AccessLogGroupName`, {
      value: apiRet.accessLogGroup.logGroupName,
    });
  }
}
