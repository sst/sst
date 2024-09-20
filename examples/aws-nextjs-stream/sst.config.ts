/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS Next.js streaming
 *
 * An example of how to use streaming Next.js RSC. Uses `Suspense` to stream an async component.
 *
 * ```tsx title="app/page.tsx"
 * <Suspense fallback={<div>Loading...</div>}>
 *   <Friends />
 * </Suspense>
 * ```
 *
 * For this demo we also need to make sure the route is not statically built.
 *
 * ```ts title="app/page.tsx"
 * export const dynamic = "force-dynamic";
 * ```
 *
 * This is deployed with OpenNext, which needs a config to enable streaming.
 *
 * ```ts title="open-next.config.ts" {4}
 * export default {
 *   default: {
 *     override: {
 *       wrapper: "aws-lambda-streaming"
 *     }
 *   }
 * };
 * ```
 *
 * You should see the _friends_ section load after a 3 second delay.
 *
 * :::note
 * Safari handles streaming differently than other browsers.
 * :::
 *
 * Safari uses a [different heuristic](https://bugs.webkit.org/show_bug.cgi?id=252413) to
 * determine when to stream data. You need to render _enough_ initial HTML to trigger streaming.
 * This is typically only a problem for demo apps.
 */
export default $config({
  app(input) {
    return {
      name: "aws-nextjs-stream",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Nextjs("MyWeb");
  },
});
