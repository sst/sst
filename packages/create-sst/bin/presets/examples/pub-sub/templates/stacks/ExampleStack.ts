import { Api, StackContext, Topic } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create Topic
  const topic = new Topic(stack, "Ordered", {
    subscribers: {
      receipt: "packages/functions/src/receipt.main",
      shipping: "packages/functions/src/shipping.main",
    },
  });

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Bind the topic to our API
        bind: [topic],
      },
    },
    routes: {
      "POST /order": "packages/functions/src/order.main",
    },
  });

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
