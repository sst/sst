import { Api, EventBus, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  const bus = new EventBus(stack, "Ordered", {
    rules: {
      rule1: {
        pattern: {
          source: ["myevent"],
          detailType: ["Order"],
        },
        targets: {
          receipt: "packages/functions/srcreceipt.handler",
          shipping: "packages/functions/srcshipping.handler",
        },
      },
    },
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        bind: [bus],
      },
    },
    routes: {
      "POST /order": "packages/functions/srcorder.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
