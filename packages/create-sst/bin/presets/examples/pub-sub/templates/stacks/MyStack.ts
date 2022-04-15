import { Api, StackContext, Topic } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create Topic
  const topic = new Topic(stack, "Ordered", {
    subscribers: {
      receipt: "receipt.main",
      shipping: "shipping.main",
    },
  });

  // Create the HTTP API
  const api = new Api(this, "Api", {
    defaults: {
      function: {
        // Pass in the topic to our API
        environment: {
          topicArn: topic.topicArn,
        },
      },
    },
    routes: {
      "POST /order": "order.main",
    },
  });

  // Allow the API to publish the topic
  api.attachPermissions([topic]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
