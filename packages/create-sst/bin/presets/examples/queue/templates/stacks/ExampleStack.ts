import { StackContext, Queue, Api } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create Queue
  const queue = new Queue(stack, "Queue", {
    consumer: "packages/functions/src/consumer.main",
  });

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Bind the queue to our API
        bind: [queue],
      },
    },
    routes: {
      "POST /": "packages/functions/src/lambda.main",
    },
  });

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
