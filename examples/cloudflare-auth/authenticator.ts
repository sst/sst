import { auth } from "sst/auth";

const session = auth.sessions<{
  user: {
    userID: string;
  };
}>();

const authorizer = () =>
  auth.authorizer({
    providers: {},
    session,
    callbacks: {
      auth: {
        async allowClient() {
          return true;
        },
        async success(ctx, input, req) {
          return ctx.session({
            type: "user",
            properties: {
              userID: "ok",
            },
          });
        },
      },
    },
  });

export default {
  fetch(event: any, ctx: any) {
    return authorizer().fetch(event, ctx);
  },
};
