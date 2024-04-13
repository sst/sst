import { Resource } from "sst";
import { AuthHandler, aws } from "sst/dist/auth";
import { GithubAdapter, CodeAdapter } from "sst/dist/auth/adapter";
import { session } from "./session.js";

const honoApp = AuthHandler({
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
        return (
          clientID === "remix" && redirect.startsWith("https://example.com")
        );
      },
      async success(ctx, input) {
        if (input.provider === "github") {
          return Response.redirect("/provider/2fa");
        }
      },
    },
  },
});
export const handler = aws(honoApp);

// 1. remix ->
//    GET auth.example.com/github/authorize
//    ?client_id=remix&redirect_uri=https://example.com&response_type=code
// 2. callbacks.login.allowClient -> is ok?
// 3. callbacks.login.start -> doesn't intercept?
// 4. triggers provider /authorize
// 5. github -> 301 github.com/login/oauth/authorize
// 6. browser does login
// 7. browser -> auth.example.com/github/callback?code=...
// 8. provider -> handles /callback -> is ok?
// 9. callbacks.login.success(payload) -> issues session?
// 10. GET redirect_uri?code=...&state=... -> remix

// auth.example.com/.well-known/openid-configuration
