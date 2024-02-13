import { AuthHandler } from "../handler.js";
import { LinkAdapter } from "../adapter/link.js";
import { createSessionBuilder } from "../session.js";

const sessions = createSessionBuilder<{
  user: {
    email: string;
  };
}>();

export default AuthHandler(
  sessions,
  {
    link: LinkAdapter({
      async onLink(link, claims: { email: string }) {
        return new Response(link, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      },
    }),
  },
  {
    auth: {
      async allowClient(input) {
        return true;
      },
      async success(ctx, input) {
        return ctx.session({
          type: "user",
          properties: {
            email: input.email,
          },
        });
      },
    },
  },
);
