import { RemovalPolicy } from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const stream = new sst.KinesisStream(this, "Stream", {
      consumers: {
        consumer: "src/lambda.main",
      },
    });

    const table = new sst.Table(this, "Table", {
      fields: {
        userId: sst.TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "userId" },
      dynamodbTable: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      kinesisStream: stream,
    });

    this.addOutputs({
      TableArn: table.tableArn,
      StreamName: stream.streamName,
    });
  }
}
