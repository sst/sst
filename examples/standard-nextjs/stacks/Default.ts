import { StackContext, NextjsSite } from "sst/constructs";

export function Default({ stack }: StackContext) {
  const site = new NextjsSite(stack, "site", {
    path: "packages/next",
  });
  stack.addOutputs({
    ApiEndpoint: site.url || "http://localhost:3000",
  });
}
