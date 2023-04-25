import { StackContext } from "sst/constructs";
import { Auth as SSTAuth } from "sst/constructs/future";

export function Auth({ stack }: StackContext) {
  const auth = new SSTAuth(stack, "auth", {
    authenticator: "packages/functions/src/auth.handler",
  });

  stack.addOutputs({
    AuthEndpoint: auth.url,
  });

  return auth;
}
