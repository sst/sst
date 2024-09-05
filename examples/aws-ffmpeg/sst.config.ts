/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## FFmpeg in Lambda
 *
 * Uses [FFmpeg](https://ffmpeg.org/) to process videos. In this example, it takes a `clip.mp4`
 * and grabs a single frame from it.
 *
 * :::tip
 * You don't need to use a Lambda layer to use FFmpeg.
 * :::
 *
 * We use the [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) package that
 * contains pre-built binaries for all architectures.
 *
 * ```ts title="index.ts"
 * import ffmpeg from "ffmpeg-static";
 * ```
 *
 * We can use this to spawn a child process and run FFmpeg.
 *
 * ```ts title="index.ts"
 * spawnSync(ffmpeg, ffmpegParams, { stdio: "pipe" });
 * ```
 *
 * We don't need a layer when we deploy this because SST will use the right binary for the
 * target Lambda architecture; including `arm64`.
 *
 * ```json title="sst.config.ts"
 * {
 *   nodejs: { install: ["ffmpeg-static"] }
 * }
 * ```
 *
 * All this is handled by [`nodejs.install`](/docs/component/aws/function#nodejs-install).
 */
export default $config({
  app(input) {
    return {
      name: "aws-ffmpeg",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const func = new sst.aws.Function("MyFunction", {
      url: true,
      memory: "2 GB",
      timeout: "15 minutes",
      handler: "index.handler",
      copyFiles: [{ from: "clip.mp4" }],
      nodejs: { install: ["ffmpeg-static"] },
    });

    return {
      url: func.url,
    };
  },
});
