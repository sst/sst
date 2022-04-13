import { Api, KinesisStream, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
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
        environment: {
          streamName: stream.streamName,
        },
      },
    },
    routes: {
      "POST /": "lambda.handler",
    },
  });

  api.attachPermissions([stream]);

  // Show the endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
