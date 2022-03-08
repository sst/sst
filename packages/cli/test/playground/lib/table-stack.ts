import { RemovalPolicy } from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const table = new sst.Table(this, "Table", {
      fields: {
        userId: sst.TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "userId" },
      dynamodbTable: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
      defaultFunctionProps: {
        timeout: 3,
      },
      stream: true,
      consumers: {
        consumerA: "src/lambda.main",
      },
    });

    this.addOutputs({
      TableArn: table.tableArn,
    });
  }
}
