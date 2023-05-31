---
title: SST CLI
sidebar_label: sst
description: "Reference docs for the SST CLI."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

The SST CLI allows you to build, deploy, test, and manage SST apps.

</HeadlineText>

---

## Installation

Install the [`sst`](https://www.npmjs.com/package/sst) npm package in your project root.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm install sst --save-exact
```

</TabItem>
<TabItem value="yarn">

```bash
yarn add sst --exact
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm add sst --save-exact
```

</TabItem>
</MultiPackagerCode>

If you are using our starters, the `sst` package should already be installed.

---

## Usage

Once installed, you can run the commands using.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst <command>
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst <command>
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst <command>
```

</TabItem>
</MultiPackagerCode>

This will run the commands using the locally installed version of SST.

---

### AWS profile

Specify the AWS account you want to deploy to by using the `--profile` option. If not specified, uses the default AWS profile. [Read more about AWS profiles here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html#cli-configure-files-format). For example:

```bash
npx sst deploy --profile=production
```

Where `production` is a profile defined locally in your `~/.aws/credentials`.

Or, use the `AWS_PROFILE` CLI environment variable

```bash
AWS_PROFILE=production npx sst deploy
```

---

## Commands

Let's look at the commands in the SST CLI.

---

### `sst dev`

Starts up a local development environment for your Lambda functions, powered by [Live Lambda Dev](../live-lambda-development.md). It allows you to make changes and test your functions without having to deploy them.

```bash
npx sst dev [options]
```

In addition to the [global options](#global-options), the following options are supported.

#### Options

- **`--rollback`**

  _Default_: `true`

  By default SST enables rollback on failure. This is so that any mistakes do not leave your infrastructure in an inconsistent state. To override this behavior pass in `--rollback=false`.

- **`--increase-timeout`**

  _Default_: Default Lambda function timeout

  Pass in the `--increase-timeout` option if you want to increase the timeout value for all the Lambda functions in your app to 15 minutes (the maximum value). This gives you more time to inspect your breakpoints before the functions timeout.

  This option is meant to be used when debugging with VS Code or other debuggers that can set breakpoints.

  A couple of things to note when `--increase-timeout` option is enabled:

  - APIs have a timeout of 30 seconds. So if the Lambda function does not return after 30 seconds, the API request will timeout. However, you can continue to debug your Lambda functions. The request might fail but the breakpoint context is still preserved for 15 minutes.
  - Queues need to have a [visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) that is longer than the timeout of the subscribing Lambda function. If the visibility timeout is configured to less than 15 minutes, it'll be increased to 15 minutes as well.

---

### `sst diff`

Compares the current version of the stacks in your app with the ones that've been deployed to AWS. This can be helpful in doing a quick check before deploying your changes to prod.

```bash
npx sst diff [stacks..] [options]
```

You can diff against a stage.

```bash
npx sst diff --stage prod
```

You can also optionally compare a list of stacks.

```bash
npx sst diff stack-a stack-b
```

#### Options

- **`--dev`**

  By default, SST will diff against the target stage as it would be deployed using `sst deploy`. If you are running a stage locally using [`sst dev`](../live-lambda-development.md), then pass in `--dev` to diff against the dev version.

---

### `sst bind`

Bind your app's resources to the given `command`. This allows the [`sst/node`](clients/index.md) client to work as if it was running inside a Lambda function.

```bash
npx sst bind <command> [options]
```

So for example, you can start your frontend with all the binding values.

```bash
npx sst bind next dev
```

`sst bind` auto-detects the following frontend frameworks.

- Angular: detects `angular.json`
- Astro: detects `astro.config.js`
- Create React App: detects `react-scripts` in `package.json`
- Ember: detects `ember-cli-build.js`
- Gatsby: detects `gatsby-config.js`
- Next.js: detects `next.config.js`
- Plain HTML: detects `index.html`
- Preact: detects `@preact/preset-vite` in `vite.config.js`
- React: detects `plugin-react` in `vite.config.js`
- Remix: detects `remix.config.js`
- Solid: detects `solid-start` in `vite.config.js`
- Svelte: detects `svelte.config.js`
- Vue: detects `plugin-vue` in `vite.config.js`

When detected, `sst bind` will load the site's bound resources, environment variables, and the IAM permissions granted to the site.

If a frontend framework is not detected in the current directory, `sst bind` will bind all the resources in your app and use it to run the command.

For example, you can use it to [run your tests](../testing.md).

```bash
npx sst bind vitest run
```

You can also use the `sst bind` to run any scripts.

#### Options

- **`--site`**

  If your framework is not auto-detected by SST, then pass in `--site` to signal to SST that you are starting your frontend.

  ```bash
  npx sst bind --site npm run start
  ```

- **`--script`**

  Similarly, if SST has detected a frontend framework in the current directory, but you are not starting your frontend, then pass in `--script`. This is useful when you are running a script inside your frontend directory.

  ```bash
  npx sst bind --script npm run build
  ```

---

### `sst build`

Build your app and synthesize your stacks. Builds the assets for your functions and sites. And generates a `.sst/dist/` directory with the synthesized CloudFormation stacks.

```bash
npx sst build [options]
```

In addition to the [global options](#global-options), the following options are supported.

#### Options

- **`--to`**

  _Default_: `.sst/dist/`

  Pass in a path for the build output. This lets you split up the deploy process and deploy without having to build the app again.

---

#### Build concurrency

SST will build your assets concurrently using the number of cores available. This can be changed using the `SST_BUILD_CONCURRENCY` environment variable. Where `SST_BUILD_CONCURRENCY` defaults to the `number of cores - 1`.

---

### `sst deploy`

Deploys your app to AWS. Or optionally deploy a specific stack by passing in a `filter`.

```bash
npx sst deploy [filter] [options]
```

By default, it first builds your app and then deploys it. It also respects the [`SST_BUILD_CONCURRENCY`](#build-concurrency) environment variable.

In addition to the [global options](#global-options), the following options are supported.

#### Options

- **`--from`**

  _Default_: none

  Pass in a path for the build output. This lets you split up the deploy process and deploy without having to build the app again.

---

### `sst remove`

Remove your app and all their resources from AWS. Or optionally deploy a specific stack by passing in a `filter`.

```bash
npx sst remove [filter] [options]
```

:::info Removal Policy
By default, AWS does not remove resources like S3 buckets or DynamoDB tables. To let SST remove these, you'd need to [set the default removal policy](../advanced/removal-policy.md).
:::

---

### `sst update`

Updates the SST and CDK packages in your `package.json` to the latest version. Or optionally to the given `version`.

```bash
npx sst update [version] [options]
```

---

### `sst version`

Prints the version of SST your app is using. Also, prints the version of CDK that SST is using internally.

```bash
npx sst version
```

:::info
When installing additional CDK packages make sure to use the same version as the one from the `sst verion` command.
:::

---

### `sst console`

```bash
npx sst console [options]
```

Launches the [SST Console](../console.md) to manage stages that are not running locally. It uses your local credentials (or the ones you specify) to make calls to AWS.

For more context; if you run [`sst dev`](#dev) and fire up the Console, you'll see the logs for the local invocations of your functions. Whereas with the `sst console` command, you'll see their [CloudWatch](https://aws.amazon.com/cloudwatch/) logs instead. This allows you to use the Console against your production or staging environments.

:::info
This command does not instrument your code. It simply uses your local credentials to make calls to AWS.
:::

#### Options

- **`--stage`**

  _Default_: Your local stage

  The stage you want connect to. If this is not specified, it will default to your local stage.

  Connecting to a different stage.

  ```bash
  npx sst console --stage=staging
  ```

  Using a different aws profile if your stage is in another AWS account.

  ```bash
  npx sst console --stage=production --profile=acme-production
  ```

---

### `sst secrets`

Manage secrets in your app.

```bash
npx sst secrets <command> [options]
```

For example, you can set a secret.

```bash
npx sst secrets set MY_SECRET abc
```

Get the secret.

```bash
npx sst secrets get MY_SECRET
```

And remove the secret.

```bash
npx sst secrets remove MY_SECRET
```

#### Options

- **`--fallback`**

  _Default_: false

  Set this option if you want to `get`, `set`, `list`, or `remove` the fallback version of a secret. For example, to get the fallback of a secret.

  ```bash
  npx sst secrets get --fallback STRIPE_KEY
  ```

  Note that, the fallback value can only be inherited by stages deployed in the same AWS account and region. [Read more about fallback values](../config.md#fallback-values).

`sst secrets` takes the following commands.

---

#### `sst secrets get`

Decrypts and prints the value of the secret with the given `name`.

```bash
npx sst secrets get <name> [options]
```

---

#### `sst secrets set`

Sets the `value` of a secret with the given `name`.

```bash
npx sst secrets set <name> <value> [options]
```

---

#### `sst secrets load`

Loads secrets from an .env file.

```bash
npx sst secrets load <filename>
```

---

#### `sst secrets list`

Decrypts and prints out all the secrets with the given `format`; `table`, `json`, or `env`. Where `env` is the dotenv format. Defaults to `table`.

```bash
npx sst secrets list [format] [options]
```

---

#### `sst secrets remove`

Removes the secret with the given `name`.

```bash
npx sst secrets remove <name> [options]
```

---

### `sst telemetry`

SST [collects completely anonymous telemetry](../anonymous-telemetry.md) data about general usage.

```bash
npx sst telemetry <status> [options]
```

You can opt-out of this if you'd not like to share any information.

```bash
npx sst telemetry disable
```

You can also re-enable telemetry if you'd like to re-join the program.

```bash
npx sst telemetry enable
```

---

## Global options

- **`--stage`**

  _Default_: Your personal stage

  The stage you want to deploy to. If this is not specified, it will default to the stage configured during the initial run of the CLI. This is cached in the `.sst/` directory.

  This option applies to the `dev`, `build`, `deploy`, `remove`, and `secrets` commands.

- **`--profile`**

  _Default_: The `default` profile in your AWS credentials file.

  The AWS profile you want to use for deployment. Defaults to the `default` profile in your AWS credentials file.

- **`--region`**

  _Default_: Stage set in the SST config.

  The region you want to deploy to. Defaults to the one specified in your `sst.json`. Or uses `us-east-1`.

  This option applies to the `dev`, `build`, `deploy`, `remove`, and `secrets` commands.

- **`--verbose`**

  _Default_: `false`

  Prints verbose logs.

- **`--role`**

  ARN of the IAM Role to use when invoking AWS. This role must be assumable by the AWS account being used.

  This option applies to the `start`, `deploy`, and `remove` commands.
