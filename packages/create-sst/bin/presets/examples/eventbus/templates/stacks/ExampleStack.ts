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
          receipt: "functions/receipt.handler",
          shipping: "functions/shipping.handler",
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
      "POST /order": "functions/order.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
