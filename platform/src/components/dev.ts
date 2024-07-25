import { Input } from "./input";

export interface DevArgs {
  /**
   * Configure the behavior in the `sst dev` mode.
   */
  dev?: {
    /**
     * The URL in the `sst dev` mode.
     * @default `"http://url-unavailable-in-dev.mode"`
     */
    url?: Input<string>;
    /**
     * The command to run in the `sst dev` mode.
     * @default The `start` script in `package.json`
     */
    command?: Input<string>;
    /**
     * Whether to start the dev server automatically.
     * @default `true`
     */
    autostart?: Input<boolean>;
    /**
     * Path to the directory to watch for changes.
     * @default `"."`
     */
    directory?: Input<string>;
  };
}
