import { Api, StackContext, Topic } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // Create Topic
  const topic = new Topic(stack, "Ordered", {
    subscribers: {
      receipt: "packages/functions/srcreceipt.main",
      shipping: "packages/functions/srcshipping.main",
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
      "POST /order": "packages/functions/srcorder.main",
    },
  });

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
