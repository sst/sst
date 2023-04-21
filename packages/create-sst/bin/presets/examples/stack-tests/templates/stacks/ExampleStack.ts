import { StackContext, Function } from "sst/constructs";

export function ExampleStack({ app, stack }: StackContext) {
  new Function(stack, "Fn", {
    handler: "packages/functions/src/lambda.handler",
    timeout: app.stage === "prod" ? 20 : 10,
  });
}
