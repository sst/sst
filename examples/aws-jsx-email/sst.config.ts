/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS JSX Email
 *
 * Uses [JSX Email](https://jsx.email) and the `Email` component to design and send emails.
 *
 * To test this example, change the `sst.config.ts` to use your own email address.
 *
 * ```ts title="sst.config.ts"
 * sender: "email@example.com"
 * ```
 *
 * Then run.
 *
 * ```bash
 * npm install
 * npx sst dev
 * ```
 *
 * You'll get an email from AWS asking you to confirm your email address. Click the link to
 * verify it.
 *
 * Next, go to the URL in the `sst dev` CLI output. You should now receive an email rendered
 * using JSX Email.
 *
 * ```ts title="index.ts"
 * import { Template } from "./templates/email";
 *
 * await render(Template({
 *   email: "spongebob@example.com",
 *   name: "Spongebob Squarepants"
 * }))
 * ```
 *
 * Once you are ready to go to production, you can:
 *
 * - [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) for SES
 * - And [use your domain](/docs/component/aws/email/) to send emails
 */
export default $config({
  app(input) {
    return {
      name: "aws-jsx-email",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const email = new sst.aws.Email("MyEmail", {
      sender: "email@example.com",
    });
    const api = new sst.aws.Function("MyApi", {
      handler: "index.handler",
      link: [email],
      url: true,
    });

    return {
      api: api.url,
    };
  },
});
