import { Api, KinesisStream, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  // create a kinesis stream
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumer1: "consumer1.handler",
      consumer2: "consumer2.handler",
    },
  });

  // Create a HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        bind: [stream],
      },
    },
    routes: {
      "POST /": "packages/functions/srclambda.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
