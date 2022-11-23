import { Api, KinesisStream, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // create a kinesis stream
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumer1: "functions/consumer1.handler",
      consumer2: "functions/consumer2.handler",
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
      "POST /": "functions/lambda.handler",
    },
  });

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
