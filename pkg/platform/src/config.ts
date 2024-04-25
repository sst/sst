/**
 * The `sst.config.ts` file is used to configure your SST app and its resources.
 *
 * ```ts
 * $config(input: Config): Config
 * ```
 *
 * You specify it using the `$config` function. This takes an object of type [`Config`](#config).
 *
 * ```ts title="sst.config.ts"
 * /// <reference path="./.sst/platform/config.d.ts" />
 *
 * export default $config({
 *   app(input) {
 *     return {
 *       name: "my-sst-app",
 *       home: "aws"
 *     };
 *   },
 *   async run() {
 *     new sst.aws.Bucket("MyBucket");
 *   }
 * });
 * ```
 *
 * The `Config` object takes two functions: [`app`](#app-2) and [`run`](#run).
 *
 * The `app` function is evaluated right when your app loads. It's used to define the app config and its providers.
 *
 * :::note
 * You can Pulumi code in the `run` function not the `app` function.
 * :::
 *
 * While the `run` function is where you define your resources using SST or Pulumi's components.
 *
 * :::tip
 * The [Global](/docs/reference/global/) library can help you with your app config and resources.
 * :::
 *
 * The run function also has access to a list of [Global](/docs/reference/global/) `$` variables and functions. These serve as the context for your app config.
 *
 * @packageDocumentation
 */

export interface App {
  /**
   * Optional required version for sst.
   *
   * :::tip
   * Commands will fail if the version does not match.
   * :::
   *
   * @example
   * ```ts
   * version: ">= 0.0.300"
   * ```
   */
  version?: string;

  /**
   * The name of the app. This is used to prefix the names of the resources in your app.
   *
   * :::caution
   * If you change the name of your app, it'll redeploy your app with new resources. The old resources will be orphaned.
   * :::
   *
   * This means that you don't want to change the name of your app without removing the old resources first.
   *
   * @example
   *
   * ```ts
   * {
   *   name: "my-sst-app"
   * }
   * ```
   */
  name: string;
  /**
   * Configure how your resources are handled on `sst remove`:
   *
   * - `remove`: Remove all your resources on remove.
   * - `retain`: Retains S3 buckets and DynamoDB tables, and remove all other resources.
   * - `retain-all`: Retains all your resources on remove.
   *
   * :::tip
   * It's a good idea to use `retain` for your production stage.
   * :::
   *
   * @default `"retain"`
   * @example
   * Retain resources if it's the _production_ stage, otherwise remove all resources.
   * ```ts
   * {
   *   removal: input.stage === "production" ? "retain" : "remove"
   * }
   * ```
   */
  removal?: "remove" | "retain" | "retain-all";
  /**
   * The providers that are being used in this app. SST supports all [Pulumi's providers](https://www.pulumi.com/registry/). This allows you to use the components from these providers in your app.
   *
   * For example, if you use the [AWS Classic](https://www.pulumi.com/registry/packages/aws/) provider, you can use the `aws` components in your app.
   *
   * ```ts
   * import * as aws from "@pulumi/aws";
   *
   * new aws.s3.BucketV2("b", {
   *   bucket: "mybucket"
   * });
   * ```
   *
   * :::note
   * By default, your `home` provider is included in the `providers` list.
   * :::
   *
   * If you don't set a `provider` it uses your `home` provider with the default config. So if you set `home` to `aws`, it's the same as doing:
   *
   * ```ts
   * {
   *   home: "aws",
   *   providers: {
   *     aws: true
   *   }
   * }
   * ```
   *
   * @default The `home` provider.
   *
   * @example
   *
   * You can also configure the provider props. Here's the config for some common providers:
   * - [AWS](https://www.pulumi.com/registry/packages/aws/api-docs/provider/#inputs)
   * - [Cloudflare](https://www.pulumi.com/registry/packages/cloudflare/api-docs/provider/#inputs)
   *
   * For example, to change the region for AWS.
   *
   * ```ts
   * {
   *   providers: {
   *     aws: {
   *       region: "us-west-2"
   *     }
   *   }
   * }
   * ```
   *
   * You also add multiple providers.
   *
   * ```ts
   * {
   *   providers: {
   *     aws: true,
   *     cloudflare: true
   *   }
   * }
   * ```
   *
   * By default, we use the latest verion of a provider. But you can optionally specify a version.
   *
   * ```ts
   * {
   *   providers: {
   *     aws: {
   *       version: "6.27.0"
   *     }
   *   }
   * }
   * ```
   */
  providers?: Record<string, any>;

  /**
   * The provider SST will use to store the state for your app. The state keeps track of all your resources and secrets. The state is generated locally and backed up in your cloud provider.
   *
   * :::tip
   * SST uses the `home` provider to store the state for your app.
   * :::
   *
   * Currently supports AWS and Cloudflare.
   *
   * Setting the `home` provider is the same as setting the `providers` list. So if you set `home` to `aws`, it's the same as doing:
   *
   * ```ts
   * {
   *   home: "aws",
   *   providers: {
   *     aws: true
   *   }
   * }
   * ```
   *
   * If you want to configure your home provider, you can:
   *
   * ```ts
   * {
   *   home: "aws",
   *   providers: {
   *     aws: {
   *       region: "us-west-2"
   *     }
   *   }
   * }
   * ```
   *
   */
  home: "aws" | "cloudflare";
}

export interface AppInput {
  /**
   * The stage this app is running on. This is a string that can be passed in through the CLI.
   *
   * :::tip
   * Changing the stage will redeploy your app to a new stage with new resources. The old resources will still be around in the old stage.
   * :::
   *
   * If not passed in, it'll use the username of your local machine, or prompt you for it.
   */
  stage: string;
}

export interface Config {
  /**
   * The config for your app. It needs to return an object of type [`App`](#app-1).
   *
   * :::tip
   * The `app` function is evaluated when your app loads.
   * :::
   *
   * @example
   *
   * ```ts
   * app(input) {
   *   return {
   *     name: "my-sst-app",
   *     home: "aws",
   *     providers: {
   *       aws: true,
   *       cloudflare: {
   *         accountId: "6fef9ed9089bb15de3e4198618385de2"
   *       }
   *     },
   *     removal: input.stage === "production" ? "retain" : "remove"
   *   };
   * },
   * ```
   */
  app(input: AppInput): App;
  /**
   * An async function that lets you define the resources in your app.
   *
   * :::note
   * You can use SST and Pulumi components only in the `run` function.
   * :::
   *
   * You can optionally return an object that'll be displayed as the output in the CLI.
   *
   * @example
   *
   * For exmaple, here we return the name of the bucket we created.
   *
   * ```ts
   * async run() {
   *   const bucket = new sst.aws.Bucket("MyBucket");
   *
   *   return {
   *     bucket: bucket.name
   *   };
   * }
   * ```
   *
   * This will display the following in the CLI.
   *
   * ```bash frame=\"none\"
   * buckeet: bucket-jOaikGu4rla
   * ```
   */
  run(): Promise<Record<string, any> | void>;
}

/** @internal */
export function $config(input: Config): Config {
  return input;
}
