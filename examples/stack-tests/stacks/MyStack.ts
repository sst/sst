import { StackContext, Function } from "@serverless-stack/resources";

export function MyStack({ app, stack }: StackContext) {
  new Function(stack, "Fn", {
    handler: "functions/lambda.handler",
    timeout: app.stage === "prod" ? 20 : 10,
    environment: {
      MY_ENV_VAR: process.env.MY_ENV_VAR,
    },
  });
}
