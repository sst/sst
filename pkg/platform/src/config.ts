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
 * You need TypeScript 5 to see the types in your config.
 * :::
 *
 * You can add Pulumi code in the `run` function not the `app` function. While the `run`
 * function is where you define your resources using SST or Pulumi's components.
 *
 * :::tip
 * The [Global](/docs/reference/global/) library can help you with your app config and resources.
 * :::
 *
 * The run function also has access to a list of [Global](/docs/reference/global/) `$` variables and functions. These serve as the context for your app config.
 *
 * @packageDocumentation
 */

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export interface App {
  /**
   * The version of SST supported by the app. The CLI will fail any commands if the version does
   * not match.
   *
   * :::tip
   * Useful in CI where you don't want it to automatically deploy with a new version of SST.
   * :::
   *
   * @default The latest version of SST.
   *
   * @example
   *
   * Takes a specific version.
   *
   * ```ts
   * version: "0.0.300"
   * ```
   *
   * Also supports semver ranges.
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
   * By default, we use the latest version of a provider. But you can optionally specify a version.
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

export interface Runner {
  /**
   * The service used to run the build. Currently, only AWS CodeBuild is supported.
   */
  engine: "codebuild";
  /**
   * The timeout for the build. CodeBuild supports a timeout of up to 8 hours.
   * @default `1 hour`
   */
  timeout?: `${number} ${"minute" | "minutes" | "hour" | "hours"}`;
  /**
   * The architecture of the build machine.
   * @default `x86_64`
   */
  architecture?: "x86_64" | "arm64";
  /**
   * The compute size of the build environment.
   *
   * For `x86_64`, it can be the following:
   * - `small`: 3 GB, 2 vCPUs
   * - `medium`: 7 GB, 4 vCPUs
   * - `large`: 15 GB, 8 vCPUs
   * - `xlarge`: 30 GB, 16 vCPUs
   *
   * For `arm64` architecture, only `small` and `large` are supported:
   * - `small`: 4 GB, 2 vCPUs
   * - `large`: 8 GB, 4 vCPUs
   *
   * Read more about the [CodeBuild build environments](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-compute-types.html).
   * @default `small`
   */
  compute?: "small" | "medium" | "large" | "xlarge";
}

export interface RunnerInput {
  /**
   * The stage the app will be deployed to.
   */
  stage: string;
}

export interface Target {
  /**
   * The stage the app will be deployed to.
   */
  stage: string;
  /**
   * The environment variables that will be set in the build environment.
   *
   * You will be able to access these environment variables in your SST app.
   */
  env?: Record<string, string>;
}

interface GitSender {
  /**
   * The ID of the user.
   */
  id: number;
  /**
   * The username of the user.
   */
  username: string;
}

interface GitCommit {
  /**
   * The ID of the commit.
   */
  id: string;
  /**
   * The commit message.
   */
  message: string;
}

interface GitRepo {
  /**
   * The ID of the repository.
   */
  id: number;
  /**
   * The owner of the repository.
   */
  owner: string;
  /**
   * The name of the repository.
   */
  repo: string;
}

export interface PushEvent {
  /**
   * Git push request event type.
   */
  type: "push";
  /**
   * The repository the event is coming from.
   */
  repo: Prettify<GitRepo>;
  /**
   * The branch the push event is coming from.
   */
  branch: string;
  /**
   * The commit information.
   */
  commit: Prettify<GitCommit>;
  /**
   * The user pushed the code.
   */
  sender: Prettify<GitSender>;
}

export interface PullRequestEvent {
  /**
   * Git pull request event type.
   */
  type: "pull_request";
  /**
   * The repository the event is coming from.
   */
  repo: Prettify<GitRepo>;
  /**
   * The pull request number.
   */
  number: number;
  /**
   * The base branch of the pull request. This is the branch the code is being merged into.
   */
  base: string;
  /**
   * The head branch of the pull request. This is the branch the code is coming from.
   */
  head: string;
  /**
   * The commit information.
   */
  commit: Prettify<GitCommit>;
  /**
   * The user pushed the code.
   */
  sender: Prettify<GitSender>;
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
   * Configure how your app works with the SST Console. [Learn more about Autodeploy](/docs/console#autodeploy).
   */
  console?: {
    /**
     * Configure how the Console auto-deploy's your app.
     *
     * @example
     *
     * ```ts
     * console: {
     *   autodeploy: {
     *     target(event) {
     *       if (event.type === "push" && event.branch === "main") {
     *         return { stage: "production" };
     *       }
     *     }
     *   }
     * }
     * ```
     */
    autodeploy: {
      /**
       * Optionally configure the runner that will run the build.
       *
       * When a git event is received, Autodeploy will first run the `target` function
       * to determine the stage the app will be deployed to. It'll then run the
       * `runner` function with the stage to determine the type of machine
       * that'll be used.
       *
       * It uses this to create a _runner_ — a
       * [AWS CodeBuild](https://aws.amazon.com/codebuild/) project and an IAM Role,
       * in **your account**.
       *
       * :::note
       * Runners are shared across all apps in the same account and region.
       * :::
       *
       * By default it uses:
       *
       * ```ts
       * runner(input) {
       *   return {
       *     engine: "codebuild",
       *     architecture: "x86_64",
       *     compute: "small",
       *     timeout: "1 hour"
       *   };
       * }
       * ```
       *
       * Once a runner is created, it can be used to run multiple builds of the same
       * machine config concurrently.
       *
       * :::note
       * A runner can run multiple builds concurrently.
       * :::
       *
       * You are only charged for the number of build
       * minutes that you use. The pricing is based on the machine config used.
       * [Learn more about CodeBuild pricing](https://aws.amazon.com/codebuild/pricing/).
       *
       * You can also configure the runner based on the stage.
       *
       * ```ts {2}
       * runner(input) {
       *   return input.stage.includes("prod")
       *     ? {
       *       engine: "codebuild",
       *       compute: "large",
       *       timeout: "1 hour"
       *     }
       *     : {
       *       engine: "codebuild",
       *       compute: "small"
       *     };
       * }
       * ```
       *
       * If a runner with the given config has been been previously created,
       * it'll be resused. The Console will also automatically remove runners that
       * have not been used for more than 7 days.
       */
      runner?(input: RunnerInput): Runner;
      /**
       * Defines the stage the app will be auto-deployed to. For example, to auto-deploy
       * to the `production` stage when you git push to the `main` branch.
       *
       * ```ts
       * target(event) {
       *   if (event.type === "push" && event.branch === "main") {
       *     return { stage: "production" };
       *   }
       * }
       * ```
       *
       * When a git event is received, Autodeploy will run the `target` function with
       * the git event. This function should return the stage the app will be deployed to.
       *
       * :::tip
       * Use the git event to configure the stage your app will be deployed to.
       * :::
       *
       * The stage that is returned is then compared to the deployment target set in the
       * app settings in the Console. If the stage matches a deployment target, the app will
       * be deployed to the AWS account of that target.
       *
       * :::caution
       * If a target is not returned, the app will not be deployed.
       * :::
       *
       * The following git events are supported:
       *
       * - **`push`**, when you git push to a branch. For example, a git push to the `main` branch.
       *
       *   ```js
       *   {
       *     type: "push",
       *     repo: {
       *       id: 1296269,
       *       owner: "octocat",
       *       repo: "Hello-World"
       *     },
       *     branch: "main",
       *     commit: {
       *       id: "b7e7c4c559e0e5b4bc6f8d98e0e5e5e5e5e5e5e5",
       *       message: "Update the README with new information"
       *     },
       *     sender: {
       *       id: 1,
       *       username: "octocat"
       *     }
       *   }
       *   ```
       *
       * - `pull_request`, when a pull request is opened or updated. For example, pull request
       *   `#1347` from the `feature` branch to the `main` branch.
       *
       *   ```js
       *   {
       *     type: "pull_request",
       *     repo: {
       *       id: 1296269,
       *       owner: "octocat",
       *       repo: "Hello-World"
       *     },
       *     number: 1347,
       *     base: "main",
       *     head: "changes",
       *     commit: {
       *       id: "b7e7c4c559e0e5b4bc6f8d98e0e5e5e5e5e5e5e5",
       *       message: "Update the README with new information"
       *     },
       *     sender: {
       *       id: 1,
       *       username: "octocat"
       *     }
       *   }
       *   ```
       *
       * You can use these events to setup a workflow. For example, where each git push to
       * `main` deploys the `production` stage. And any pull request is deployed to a new stage.
       *
       * ```ts
       * target(event) {
       *   if (event.type === "push" && event.branch === "main") {
       *     return { stage: "production" };
       *   }
       *   else if (event.type === "pull_request") {
       *     return { stage: `pr-${event.number}` };
       *   }
       * }
       * ```
       */
      target(input: PushEvent | PullRequestEvent): Target | undefined;
    };
  };
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
   * For example, here we return the name of the bucket we created.
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
   * bucket: bucket-jOaikGu4rla
   * ```
   */
  run(): Promise<Record<string, any> | void>;
}

/** @internal */
export function $config(input: Config): Config {
  return input;
}
