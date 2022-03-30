import { CfnOutput } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sst from "@serverless-stack/resources";

export default class DynamoDBStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const stage = this.node.root.stage;
    const service = this.node.root.name;

    const stageTableName = this.node.root.logicalPrefixedName("notes");
    const table = new dynamodb.Table(this, stageTableName, {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "noteId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Export values
    new CfnOutput(this, "notesTableName", {
      exportName: `${stage}-${service}-ExtNotesTableName`,
      value: table.tableName,
    });
    new CfnOutput(this, "notesTableArn", {
      exportName: `${stage}-${service}-ExtNotesTableArn`,
      value: table.tableArn,
    });
  }
}
