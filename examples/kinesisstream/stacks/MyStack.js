import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // create a kinesis stream
    const stream = new sst.KinesisStream(this, "Stream", {
      consumers: {
        consumer1: "src/consumer1.handler",
        consumer2: "src/consumer2.handler",
      },
    });

    // Create a HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        environment: {
          streamName: stream.streamName,
        },
      },
      routes: {
        "POST /": "src/lambda.handler",
      },
    });

    api.attachPermissions([stream]);

    // Show the endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
