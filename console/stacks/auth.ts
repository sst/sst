import { StackContext, use } from "sst/constructs";
import { Auth as SSTAuth } from "sst/constructs/future";
import { Secrets } from "./secrets";

export function Auth({ stack }: StackContext) {
  const { github, database } = use(Secrets);
  const auth = new SSTAuth(stack, "auth", {
    authenticator: {
      handler: "packages/functions/src/auth.handler",
      bind: [
        github.GITHUB_CLIENT_ID,
        github.GITHUB_CLIENT_SECRET,
        database.PLANETSCALE_HOST,
        database.PLANETSCALE_PASSWORD,
        database.PLANETSCALE_USERNAME,
      ],
    },
  });

  stack.addOutputs({
    AuthEndpoint: auth.url,
  });

  return auth;
}
