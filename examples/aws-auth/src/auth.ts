import { Resource } from "sst";
import { auth } from "sst/aws/auth";
import { GithubAdapter } from "sst/auth/adapter";
import { session } from "./session.js";

export const handler = auth.authorizer({
  session,
  providers: {
    github: GithubAdapter({
      clientID: Resource.GithubClientID.value,
      mode: "oidc",
    }),
  },
  callbacks: {
    auth: {
      async allowClient(clientID: string, redirect: string) {
        return true;
      },
      async success(ctx, input) {
        if (input.provider === "github") {
          return ctx.session({
            type: "user",
            properties: {
              email: input.tokenset.claims().email!,
            },
          });
        }
      },
    },
  },
});
