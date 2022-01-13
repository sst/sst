import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sst from "@serverless-stack/resources";

class DynamoDBStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    console.log(this.node.tryGetContext("context_test"));

    new dynamodb.Table(this, "notes", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    });
  }
}

export default function main(app) {
  new DynamoDBStack(app, "dynamodb");
}
