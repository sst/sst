import "@types/node";
import * as util from "@pulumi/pulumi";
import * as _sst from "./components/index";
import { $config as config, App } from "./config";

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

/** @internal */
interface $APP
  extends Readonly<
    Omit<App, "providers"> & {
      /**
       * The stage of the app
       */
      stage: string;
      /**
       * The providers to use in the app
       */
      providers: App["providers"];
    }
  > {}

declare global {
  // @ts-expect-error
  export import sst = _sst;

  /** @internal */
  export const $config: typeof config;

  /** @internal */
  export const $linkable: typeof import("./components/link").Link.makeLinkable;

  /**
   * Access the Pulumi SDK utilities without needing to import them.
   *
   * @example
   * To create a new asset, you can do
   * ```ts
   * const myFiles = new $util.asset.FileArchive("./path/to/files");
   * ```
   *
   * This is equivalent to
   * ```ts
   * import * as pulumi from "@pulumi/pulumi";
   *
   * const myFiles = new pulumi.asset.FileArchive("./path/to/files");
   * ```
   */
  // @ts-expect-error
  export import $util = util;

  /** @internal */
  export const $output: typeof util.output;
  /**
   * Wait for all Output values to resolve
   * @example
   * ```ts
   * declare value1: Output<string>;
   * declare value2: Output<string>;
   *
   * $all([value1, value2]).apply(([value1, value2]) =>
   *   console.log({ value1, value2 })
   * );
   * ```
   */
  export const $all: typeof util.all;
  /**
   * String interpolation with Output values.
   *
   * @example
   * ```ts
   * const bucket = new sst.aws.Bucket("MyBucket");
   *
   * const description = $interpolate`This is a bucket named ${bucket.name}`;
   * ```
   *
   * This is equivalent to
   * ```ts
   * const description = bucket.name.apply(name => `This is a bucket named ${name}`);
   * ```
   */
  export const $interpolate: typeof util.interpolate;

  /**
   * Information about the app
   */
  export const $app: Simplify<$APP>;

  /**
   * True if running in `sst dev`
   */
  export const $dev: boolean;

  /** @internal */
  export const $cli: {
    command: string;
    paths: {
      home: string;
      root: string;
      work: string;
      platform: string;
    };
    backend: string;
  };
}
