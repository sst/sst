import { StackContext, Function } from "@serverless-stack/resources";

export function MyStack({ app, stack }: StackContext) {
  new Function(stack, "Fn", {
    handler: "functions/lambda.handler",
    timeout: app.stage === "prod" ? 20 : 10,
    environment: {
      GREETING: process.env.GREETING,
    },
  });
}