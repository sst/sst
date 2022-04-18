import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create Topic
    const topic = new sst.Topic(this, "Ordered", {
      subscribers: ["src/receipt.main", "src/shipping.main"],
    });

    // Create the HTTP API
    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        // Pass in the topic to our API
        environment: {
          topicArn: topic.snsTopic.topicArn,
        },
      },
      routes: {
        "POST /order": "src/order.main",
      },
    });

    // Allow the API to publish the topic
    api.attachPermissions([topic]);

    // Show the API endpoint in the output
    this.addOutputs({
      ApiEndpoint: api.url,
    });
  }
}
