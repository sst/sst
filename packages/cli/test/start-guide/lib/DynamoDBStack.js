import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sst from "@serverless-stack/resources";

export default class DynamoDBStack extends sst.Stack {
  // Public reference to the DB table
  table;

  constructor(scope, id, props) {
    super(scope, id, props);

    const table = new sst.Table(this, "Notes", {
      fields: {
        userId: dynamodb.AttributeType.STRING,
        noteId: dynamodb.AttributeType.STRING,
      },
      primaryIndex: { partitionKey: "userId", sortKey: "noteId" },
    });

    this.table = table;
  }
}
