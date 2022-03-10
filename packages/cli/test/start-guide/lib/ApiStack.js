import * as cdk from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export default class ApiStack extends sst.Stack {
  httpApi;

  constructor(scope, id, props) {
    super(scope, id, props);

    const { table } = props;

    // Create API
    const api = new sst.Api(this, "Api", {
      routes: {
        "GET    /notes": "list.main",
        "POST   /notes": "create.main",
        "GET    /notes/{id}": "get.main",
        "PUT    /notes/{id}": "update.main",
        "DELETE /notes/{id}": "delete.main",
      },
      defaultAuthorizationType: "AWS_IAM",
      defaultFunctionProps: {
        srcPath: "services/notes",
        environment: { tableName: table.dynamodbTable.tableName },
      },
    });
    api.attachPermissions([table]);

    // set API endpoint as stack output
    new cdk.CfnOutput(this, `ApiEndpoint`, {
      value: api.httpApi.apiEndpoint,
    });

    // set log group name as stack output
    new cdk.CfnOutput(this, `AccessLogGroupName`, {
      value: api.accessLogGroup.logGroupName,
    });

    this.httpApi = api.httpApi;
  }
}
