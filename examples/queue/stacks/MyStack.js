import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create Queue
    const queue = new sst.Queue(this, "Queue", {
      consumer: "src/consumer.main",
    });

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        // Pass in the queue to our API
        environment: {
          queueUrl: queue.sqsQueue.queueUrl,
        },
      },
      routes: {
        "POST /": "src/lambda.main",
      },
    });

    // Allow the API to publish the queue
    api.attachPermissions([queue]);

    // Show the API endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
