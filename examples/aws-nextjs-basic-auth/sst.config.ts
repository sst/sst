/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS Next.js basic auth
 *
 * Deploys a simple Next.js app and adds basic auth to it.
 *
 * This is useful for dev environments where you want to share your app your team but ensure
 * that it's not publicly accessible.
 *
 * :::tip
 * You can use this for all the SSR sites, like Astro, Remix, SvelteKit, etc.
 * :::
 *
 * This works by injecting some code into a CloudFront function that checks the basic auth
 * header and matches it against the `USERNAME` and `PASSWORD` secrets.
 *
 * ```ts title="sst.config.ts"
 * {
 *   injection: $interpolate`
 *     if (
 *         !event.request.headers.authorization
 *           || event.request.headers.authorization.value !== "Basic ${basicAuth}"
 *        ) {
 *       return {
 *         statusCode: 401,
 *         headers: {
 *           "www-authenticate": { value: "Basic" }
 *         }
 *       };
 *     }`,
 * }
 * ```
 *
 * To deploy this, you need to first set the `USERNAME` and `PASSWORD` secrets.
 *
 * ```bash
 * sst secret set USERNAME my-username
 * sst secret set PASSWORD my-password
 * ```
 *
 * If you are deploying this to preview environments, you might want to set the secrets using
 * the [`--fallback`](/docs/reference/cli#secret) flag.
 */
export default $config({
  app(input) {
    return {
      name: "aws-nextjs-basic-auth",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const username = new sst.Secret("USERNAME");
    const password = new sst.Secret("PASSWORD");
    const basicAuth = $resolve([username.value, password.value]).apply(
      ([username, password]) =>
        Buffer.from(`${username}:${password}`).toString("base64")
    );

    new sst.aws.Nextjs("MyWeb", {
      server: {
        // Don't password protect prod
        edge: $app.stage !== "production"
          ? {
            viewerRequest: {
              injection: $interpolate`
                if (
                    !event.request.headers.authorization
                      || event.request.headers.authorization.value !== "Basic ${basicAuth}"
                   ) {
                  return {
                    statusCode: 401,
                    headers: {
                      "www-authenticate": { value: "Basic" }
                    }
                  };
                }`,
            },
          }
          : undefined,
      },
    });
  },
});
