import { Resource } from "sst";
import { AuthHandler, aws } from "sst/auth";
import { GithubAdapter } from "sst/auth/adapter";
import { session } from "./session.js";

export const handler = aws(
  AuthHandler({
    session,
    providers: {
      github: GithubAdapter({
        clientID: Resource.GithubClientID.value,
        mode: "oidc",
      }),
    },
    callbacks: {
      auth: {
        async allowClient() {
          return true;
        },
        success(ctx, input) {
          const claims = input.tokenset.claims();
          console.log(claims);
          return ctx.session({
            type: "user",
            properties: {
              email: claims.email,
            },
          });
        },
      },
    },
  }),
);
