import { AuthHandler } from "../handler.js";
import { LinkAdapter } from "../adapter/link.js";
import { createSessionBuilder } from "../session.js";
import { CodeAdapter } from "../adapter/index.js";

const sessions = createSessionBuilder<{
  user: {
    email: string;
  };
}>();

export default AuthHandler({
  providers: {
    link: LinkAdapter({
      async onLink(link, claims) {
        return new Response(link, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      },
    }),
    code: CodeAdapter({
      onCodeRequest: async (code, claims) => {
        return new Response("Your code is " + code, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      },
      onCodeInvalid: async (code, claims) => {
        return new Response("Code is invalid " + code, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      },
    }),
  },
  callbacks: {
    auth: {
      async allowClient(input) {
        return true;
      },
      async success(ctx, input) {
        return ctx.session({
          type: "user",
          properties: {
            email: input.claims.email,
          },
        });
      },
    },
  },
});
