/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS Astro streaming
 *
 * Follows the [Astro Streaming](https://docs.astro.build/en/recipes/streaming-improve-page-performance/) guide to create an app that streams HTML.
 *
 * The `responseMode` in the [`astro-sst`](https://www.npmjs.com/package/astro-sst) adapter
 * is set to enable streaming.
 *
 *
 * ```ts title="astro.config.mjs"
 * adapter: aws({
 *   responseMode: "stream"
 * })
 * ```
 *
 * Now any components that return promises will be streamed.
 *
 * ```astro title="src/components/Friends.astro"
 * ---
 * import type { Character } from "./character";
 * 
 * const friends: Character[] = await new Promise((resolve) => setTimeout(() => {
 *   setTimeout(() => {
 *     resolve(
 *       [
 *         { name: "Patrick Star", image: "patrick.png" },
 *         { name: "Sandy Cheeks", image: "sandy.png" },
 *         { name: "Squidward Tentacles", image: "squidward.png" },
 *         { name: "Mr. Krabs", image: "mr-krabs.png" },
 *       ]
 *     );
 *   }, 3000);
 * }));
 * ---
 * <div class="grid">
 *   {friends.map((friend) => (
 *     <div class="card">
 *       <img class="img" src={friend.image} alt={friend.name} />
 *       <p>{friend.name}</p>
 *     </div>
 *   ))}
 * </div>
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
 * There's nothing to configure for streaming in the `Astro` component.
 */
export default $config({
  app(input) {
    return {
      name: "aws-astro-stream",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Astro("MyWeb");
  },
});
