/**
 * The Global library is a collection of `$` functions and variables that are available in the `run` function, of your [`sst.config.ts`](/docs/reference/config/).
 *
 * :::tip
 * You don't need to import the Global library. It's available in the `run` function of your `sst.config.ts`.
 * :::
 *
 * For example, you can get the name of your app in your app config using `$app.name`.
 *
 * ```ts title="sst.config.ts" {4}
 * export default $config({
 *   // ...
 *   async run() {
 *     console.log($app.name);
 *   }
 * });
 * ```
 *
 * The variables contain the context of the app that's being run. While the functions help you work with the [Outputs of components](/docs/components##inputs--outputs).
 *
 * @packageDocumentation
 */

import "@types/node";
import * as util from "@pulumi/pulumi";
import * as _sst from "./components/index";
import { $config as config, App } from "./config";

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

/** @internal */
interface $APP
  extends Readonly<{
    /**
     * The name of the current app.
     */
    name: string;
    /**
     * The stage currently being run.
     */
    stage: string;
    /**
     * The removal policy for the current stage. If `removal` was not set in the `sst.config.ts`, this will be return its default value, `retain`.
     */
    removal: "remove" | "retain" | "retain-all";
    /**
     * The providers currently being used in the app.
     */
    providers: App["providers"];
  }> {}

declare global {
  // @ts-expect-error
  export import sst = _sst;

  /** @internal */
  export const $linkable: typeof import("./components/link").Link.makeLinkable;

  /**
   * A convenience reference to the the [`util`](https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/) module from Pulumi.
   *
   * This is useful for working with components. You can use these without importing or installing the Pulumi SDK.
   *
   * @example
   *
   * For example, to create a new asset, you can:
   *
   * ```ts title="sst.config.ts"
   * const myFiles = new $util.asset.FileArchive("./path/to/files");
   * ```
   *
   * This is equivalent to doing:
   *
   * ```ts title="sst.config.ts"
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
   * Wait for a list of Output values to be resolved, and then apply a function to their resolved values.
   *
   * @example
   * Say you had a couple of S3 Buckets:
   * ```ts
   * const bucket1 = new sst.aws.Bucket("MyBucket1");
   * const bucket2 = new sst.aws.Bucket("MyBucket2");
   * ```
   *
   * You can run a function after both of them are resolved:
   *
   * ```ts
   * $resolve([bucket1.name, bucket2.name]).apply(([value1, value2]) =>
   *   console.log({ value1, value2 })
   * );
   * ```
   */
  export const $resolve: typeof util.all;
  /**
   * Use string interpolation on Output values.
   *
   * @example
   * This is takes care of resolving the Output values for you. Say you had a bucket:
   *
   * ```ts
   * const bucket = new sst.aws.Bucket("MyBucket");
   * ```
   *
   * Instead of resolving the bucket name first:
   *
   * ```ts
   * const description = bucket.name.apply(name => `This is a bucket named ${name}`);
   * ```
   *
   * You can directly do this:
   * ```ts
   * const description = $interpolate`This is a bucket named ${bucket.name}`;
   * ```
   */
  export const $interpolate: typeof util.interpolate;
  /**
   * Takes a sequence of Output values or plain JavaScript values, stringifies each,
   * and concatenates them into one final string.
   *
   * @example
   * This is takes care of resolving the Output values for you. Say you had a bucket:
   *
   * ```ts
   * const bucket = new sst.aws.Bucket("MyBucket");
   * ```
   *
   * Instead of having to resolve the bucket name first::
   *
   * ```ts
   * const description = bucket.name.apply(name =>
   *   "This is a bucket named ".concat(name)
   * );
   * ```
   *
   * You can directly do this:
   *
   * ```ts
   * const description = $concat("This is a bucket named ", bucket.name);
   * ```
   */
  export const $concat: typeof util.concat;
  /**
   * Takes an Output value or plain JavaScript value, uses `JSON.parse`
   * on the resolved JSON string to turn it into a JSON object.
   *
   * @example
   * So for example, instead of doing of resolving the value first:
   *
   * ```ts
   * const policy = policyStr.apply((policy) =>
   *   JSON.parse(policy)
   * );
   * ```
   *
   * You can directly do this:
   *
   * ```ts
   * const policy = $jsonParse(policyStr);
   * ```
   */
  export const $jsonParse: typeof util.jsonParse;
  /**
   * Takes an Output value or plain JSON object, uses `JSON.stringify`
   * on the resolved JSON object to turn it into a JSON string.
   *
   * @example
   * So for example, instead of doing of resolving the value first:
   *
   * ```ts
   * const policy = policyObj.apply((policy) =>
   *   JSON.stringify(policy)
   * );
   * ```
   *
   * You can directly do this:
   *
   * ```ts
   * const policy = $jsonStringify(policyObj);
   * ```
   */
  export const $jsonStringify: typeof util.jsonStringify;

  /**
   * Context about the app being run.
   */
  export const $app: Simplify<$APP>;

  /**
   * Returns `true` if the app is running in `sst dev`.
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
    home: string;
  };
}
