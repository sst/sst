import { StackContext, Queue, Api } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create Queue
  const queue = new Queue(stack, "Queue", {
    consumer: "consumer.main",
  });

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Pass in the queue to our API
        environment: {
          queueUrl: queue.queueName,
        },
      },
    },
    routes: {
      "POST /": "lambda.main",
    },
  });

  // Allow the API to publish the queue
  api.attachPermissions([queue]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
