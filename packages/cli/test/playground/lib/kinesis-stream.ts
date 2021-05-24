import * as sst from "@serverless-stack/resources";
import * as lambda from "@aws-cdk/aws-lambda";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    const stream = new sst.KinesisStream(this, "Stream", {
      defaultFunctionProps: {
        timeout: 3,
      },
      consumers: {
        consumerA: "src/lambda.main",
      },
    });

    this.addOutputs({
      StreamName: stream.kinesisStream.streamName,
    });
  }
}
