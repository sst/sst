import { Input } from "./input";

export interface DevArgs {
  /**
   * Configure how this component works in the `sst dev`. Instead of deploying it, this starts
   * it in dev mode. It's run as a separate process in the `sst dev`
   * multiplexer. Read more about [`sst dev`](/docs/reference/cli/#dev).
   */
  dev?: {
    /**
     * The `url` when this is running in dev mode.
     *
     * Since this component is not deployed in `sst dev`, there is no real URL. But if you are
     * using this component's `url` or linking to this component's `url`, it can be useful to
     * have a placeholder URL. It avoids having to handle it being `undefined`.
     * @default `"http://url-unavailable-in-dev.mode"`
     */
    url?: Input<string>;
    /**
     * The command that `sst dev` runs to start this in dev mode.
     * @default `"npm run dev"`
     */
    command?: Input<string>;
    /**
     * Configure if you want to automatically start this when `sst dev` starts. You can still
     * start it manually later.
     * @default `true`
     */
    autostart?: Input<boolean>;
    /**
     * Change the directory from where the `command` is run.
     * @default Uses the `path`
     */
    directory?: Input<string>;

    /**
     * The title of the tab in the multiplexer
     */
    title?: Input<string>;
  };
}
