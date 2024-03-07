/**
 * Define the app and resources in the app.
 *
 * Here's an example of `sst.config.ts`:
 * ```ts
 * export default $config({
 *   app(input) {
 *     return {
 *       name: "my-sst-app",
 *       providers: {
 *         aws: {},
 *       },
 *     };
 *   },
 *   async run() {
 *     new sst.aws.Bucket("MyBucket");
 *   }
 * });
 * ```
 *
 * @packageDocumentation
 */

/**
 * Information about the app
 */
export interface App {
  /**
   * Name of the app
   */
  name: string;
  /**
   * Whether to retain or remove resources on app removal
   * - remove: remove all resources
   * - retain: retain S3 buckets and DynamoDB tables, and remove all other resources
   * - retain-all: retain all resources
   * @default "retain"
   * @example
   * Retain resources if the stage is "production", otherwise remove all resources.
   * ```ts
   * {
   *   removalPolicy: input.stage === "production" ? "retain" : "remove",
   * }
   * ```
   */
  removalPolicy?: "remove" | "retain" | "retain-all";
  /**
   * Providers to use in the app
   * @example
   * ```ts
   * {
   *   providers: {
   *     aws: {},
   *     cloudflare: {
   *       accountId: "6fef9ed9089bb15de3e4198618385de2",
   *     },
   *   },
   * }
   * ```
   */
  providers?: Record<string, any>;
}

/**
 * Input to the app config
 */
export interface AppInput {
  /**
   * The stage currently being deployed or removed
   */
  stage: string;
}

/**
 * Config interfact holds the app and run function
 */
export interface Config {
  /**
   * Define the information about the app
   * @example
   * ```ts
   * app(input) {
   *   return {
   *     name: "my-sst-app",
   *     providers: {
   *       aws: {},
   *       cloudflare: {
   *         accountId: "6fef9ed9089bb15de3e4198618385de2",
   *       },
   *     },
   *     removalPolicy: input.stage === "production" ? "retain" : "remove",
   *   };
   * },
   * ```
   */
  app(input: AppInput): App;
  /**
   * Define the resources in the app
   * @example
   * ```ts
   * async run() {
   *   const bucket = new sst.aws.Bucket("MyBucket");
   *   return {
   *     bucketName: bucket.name,
   *   };
   * }
   * ```
   */
  run(): Promise<Record<string, any> | void>;
}

/** @internal */
export function $config(input: Config): Config {
  return input;
}
