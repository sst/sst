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
</MultiPackagerCode>

This will run the commands using the locally installed version of SST.

---

### AWS profile

Specify the AWS account you want to deploy to by using the `--profile` option. If not specified, uses the default AWS profile. [Read more about AWS profiles here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html). For example:

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

- **`--outputs-file`**

  _Default_: none

  Pass in this option if you want to write the AWS CloudFormation stack outputs to a JSON file. Works the same way as the [`--outputs-file`](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#w108aac23b7c33c13) option in AWS CDK.

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

### `sst env`

Command to load and start your frontend with the environment variables from SST.

```bash
npx sst env <command> [options]
```

So for Next.js, you can updated your `package.json` to.

```json title="package.json" {2}
"scripts": {
  "dev": "sst env \"next dev\"",
},
```

Now when you run `npm run dev` in your Next.js app, it'll have access to the [environment variables in your frontend](../constructs/NextjsSite.md#environment-variables).

<details>
<summary>How it works</summary>

Here's what's going on behind the scenes.

1. The `sst dev` command generates a file with the values specified by `StaticSite`, `RemixSite`, or `NextjsSite` construct's `environment` prop.
2. The `sst env` CLI will traverse up the directories to look for the root of your SST app. If the static site or Next.js app is located outside the SST app folder, pass in [`--path`](#--path) to specify the relative path of the SST app.
3. It'll then find the file that's generated in step 1.
4. It'll load these as environment variables before running the given command.

</details>

You can [read more about how this works for running tests](../testing.md).

#### Options

- **`--path`**

  _Default_: none

  A relative path to the directory containing the `sst.config.ts` file.

  The `sst env` CLI will traverse up the directories to look for the root of your SST app. If the static site or Next.js app is located outside the SST app folder, for example:

  ```
  /
    backend/
      sst.config.ts
    frontend/
      package.json
  ```

  Pass in `--path` to specify the relative path of the SST app.

  ```json title="package.json" {2}
  "scripts": {
    "dev": "sst env --path ../backend \"next dev\"",
  },
  ```

---

### `sst diff`

Compares the current version of the stacks in your app with the ones that've been deployed to AWS. This can be helpful in doing a quick check before deploying your changes to prod.

```bash
npx sst diff [stacks..] [options]
```

You can also optionally compare a list of stacks.

```bash
npx sst diff stack-a stack-b
```

---

### `sst bind`

Bind your app's resources to the given `command`. This allows the [`sst/node`](clients/index.md) client to work as if it was running inside a Lambda function.

```bash
npx sst bind <command> [options]
```

So for example, you can bind all the resources in your app and use it to run your tests.

```bash
npx sst bind "vitest run"
```

You can [read more about how this works for running tests](../testing.md).

---

### `sst build`

Build your app and synthesize your stacks. Generates a `.build/` directory with the compiled files and a `.build/cdk.out/` directory with the synthesized CloudFormation stacks.

```bash
npx sst build [options]
```

---

### `sst deploy`

Deploy your app to AWS. Or optionally deploy a specific stack by passing in a `filter`.

```bash
npx sst deploy [filter] [options]
```

In addition to the [global options](#global-options), the following options are supported.

#### Options

- **`--outputs-file`**

  _Default_: none

  Pass in this option if you want to write the AWS CloudFormation stack outputs to a JSON file. Works the same way as the [`--outputs-file`](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#w108aac23b7c33c13) option in AWS CDK.

- **`--rollback`**

  _Default_: `true`

  By default SST enables rollback on failure. This is so that any mistakes do not leave your infrastructure in an inconsistent state. To override this behavior pass in `--rollback=false`.

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

Updates the SST and CDK packages in your `package.json` to the given `ver`.

```bash
npx sst update [ver] [options]
```

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

This takes the following commands.

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

#### `sst secrets list`

Decrypts and prints out all the secrets with the given `format`; `table` or `env`. Where `env` is the dotenv format. Defaults to `table`.

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

#### `sst secrets get-fallback`

Decrypts and prints the fallback value of the secret with the given `name`.

```bash
npx sst secrets get-fallback <name> [options]
```

:::note
The fallback value can only be inherited by stages deployed in the same AWS account and region. [Read more about fallback values](../config.md#fallback-values).
:::

---

#### `sst secrets set-fallback`

Sets the fallback `value` of a secret with the given `name`.

```bash
npx sst secrets set-fallback <name> <value> [options]
```

---

#### `sst secrets remove-fallback`

Removes the fallback for a secret with the given `name`.

```bash
npx sst secrets remove-fallback <name> [options]
```

---

### `sst add-cdk`

Installs the given AWS CDK npm packages with the appropriate CDK version. This convenience method helps get around the [known CDK issue of version mismatches](known-issues.md).

```bash
npx sst add-cdk <package..> [options]
```

So instead of installing the CDK npm packages directly:

```bash
npm install @aws-cdk/aws-apigatewayv2-alpha @aws-cdk/aws-appsync-alpha
```

Use the `add-cdk` command instead.

```bash
npx sst add-cdk @aws-cdk/aws-apigatewayv2-alpha @aws-cdk/aws-appsync-alpha
```

In addition to the [global options](#global-options), the following options are supported.

#### Options

- **`--dev`**

  You can also pass in the `--dev` option if want to add the packages to the `devDependencies`.

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

  _Default_: Local stage

  The stage you want to deploy to. If this is not specified, it will default to the stage configured during the initial run of the CLI.

  This option applies to the `dev`, `build`, `deploy`, `remove`, and `secrets` commands.

- **`--region`**

  _Default_: Stage set in the SST config.

  The region you want to deploy to. Defaults to the one specified in your `sst.json`. Or uses `us-east-1`.

  This option applies to the `dev`, `build`, `deploy`, `remove`, and `secrets` commands.

- **`--profile`**

  _Default_: The `default` profile in your AWS credentials file.

  The AWS profile you want to use for deployment. Defaults to the `default` profile in your AWS credentials file.

- **`--fullscreen`**

  _Default_: `true`

  Disable the full screen CLI UI by passing in `--fullscreen=false`.

- **`--no-color`**

  _Default_: `false`

  Remove color and any style from the console outputs.

- **`--role-arn`**

  ARN of the IAM Role to use when invoking CloudFormation. This role must be assumable by the AWS account being used.

  This option applies to the `start`, `deploy`, and `remove` commands.
