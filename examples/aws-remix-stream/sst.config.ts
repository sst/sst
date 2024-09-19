/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS Remix streaming
 *
 * Follows the [Remix Streaming](https://remix.run/docs/en/main/guides/streaming) guide to create
 * an app that streams data.
 *
 * Uses the `defer` utility to stream data through the `loader` function.
 *
 * ```tsx title="app/routes/_index.tsx"
 * return defer({
 *   spongebob,
 *   friends: friendsPromise,
 * });
 * ```
 *
 * Then uses the the `Suspense` and `Await` components to render the data.
 *
 * ```tsx title="app/routes/_index.tsx"
 * <Suspense fallback={<div>Loading...</div>}>
 *   <Await resolve={friends}>
 *     { /* ... *\/ }
 *   </Await>
 * </Suspense>
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
 *
 * Streaming works out of the box with the `Remix` component.
 *
 */
export default $config({
  app(input) {
    return {
      name: "aws-remix-stream",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Remix("MyWeb");
  },
});
