---
title: sst
description: "Reference docs for the SST CLI."
---

import config from "../../config";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

The SST CLI (`@serverless-stack/cli`) allows you to build, deploy, test, and remove SST apps.

## Installation

While it can be installed globally, it's recommended to install it locally in your project instead.

```bash
# With npm
npm install @serverless-stack/cli --save-exact
# Or with Yarn
yarn add @serverless-stack/cli --exact
```

## Usage

Once installed locally, you can run the commands using.

```bash
# With npm
npx sst <command>
# Or with Yarn
yarn sst <command>
```

### Examples

#### The basic comma

```bash
# Start the Live Lambda Development environment
npx sst start

# Build your SST app
npx sst build

# Deploy your SST app
npx sst deploy

# Remove your SST app and all the resources
npx sst remove

# Update SST and matching CDK versions
npx sst update

# Launch the SST Console
npx sst console
```

#### Change the default stage and region

```bash
# Start
npx sst start --stage alpha --region us-west-1

# Build
npx sst build --stage alpha --region us-west-1

# Deploy
npx sst deploy --stage alpha --region us-west-1

# Remove
npx sst remove --stage alpha --region us-west-1
```

## Commands

### `start`

Starts up a local development environment for your Lambda functions. It allows you to make changes and test your functions without having to deploy them. Here is how it works:

1. Before deploying your app, SST first deploys a stack with a Lambda powered WebSocket API.
2. While deploying your app, it replaces all the `sst.Function` constructs with a _stub_ Lambda function.
3. SST starts up a local client that connects to the WebSocket API.
4. When your Lambda functions are invoked, the stub Lambdas send the request to the WebSocket API.
5. This in turn sends the request to your local SST client.
6. The client then invokes the local version of your Lambda function and sends back the results to the WebSocket API.
7. The WebSocket API responds to the stub Lambda with the results and the original request continues.

This means that for any new requests, the local version of your Lambdas will be invoked. Without having to deploy them.

Note that all this is deployed to your AWS account. There are no 3rd party services involved and your data never leaves your account. And since the WebSocket API is completely serverless, it's basically free for most use cases.

#### Build process

`sst start` also starts up a watcher to transpile your Lambda functions. When a change is detected, it does the following:

- Transpiles your ES or TS functions using [esbuild](https://esbuild.github.io).
- If a request comes in while the functions are being transpiled, it blocks them until the process is complete.
- Once transpiled, it'll respond to any blocked requests.

Thanks to esbuild and this build process, the changes are reflected as fast as possible. And by blocking the incoming requests, you can be sure that the most recent changes are reflected.

#### CDK builds

The above steps apply to the Lambda functions in your app. For the CDK code in your app, SST will automatically watch for changes and rebuild it but it won't deploy them.

Instead, it'll first compare the generated CloudFormation template to the previously built one. If there are new infrastructure changes, it'll prompt you to _press ENTER_ to deploy them. And once you do, it'll deploy your new infrastructure.

#### SST Console

When you run `sst start`, it'll give you a link to the [SST Console](../console.md).

```
$ npx sst start

==========================
Starting Live Lambda Dev
==========================

SST Console: https://console.sst.dev/acme/Jay
Debug session started. Listening for requests...
```

The SST Console is a web based dashboard to manage your apps, view real-time function invocation logs, and have the ability to replay them. To do this, a local server is started internally when you run `sst start`. It passes the AWS credentials to the Console, allowing it to make calls through the AWS SDK. Note, only the Console domain has access to this. You can [read more about how this works](../console.md#how-it-works).

#### Options

In addition to the [global options](#global-options) below, the `start` command also takes:

- `--outputs-file`

  Pass in the `--outputs-file <filename>` option if you want to write the AWS CloudFormation stack outputs to a JSON file. Works the same way as the [`--outputs-file`](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#w108aac23b7c33c13) option in AWS CDK.

- `--rollback`

  By default `sst start` enables rollback on failure. This is so that any mistakes do not leave your infrastructure in an inconsistent state. To override this behavior pass in `--rollback=false`

- `--increase-timeout`

  Pass in the `--increase-timeout` option if you want to increase the timeout value for all the Lambda functions in your app to 15 minutes (the maximum value). This gives you more time to inspect your breakpoints before the functions timeout.

  This option is meant to be used when debugging with VS Code or other debuggers that can set breakpoints.

  A couple of things to note when `--increase-timeout` option is enabled:

  - APIs have a timeout of 30 seconds. So if the Lambda function does not return after 30 seconds, the API request will timeout. However, you can continue to debug your Lambda functions. The request might fail but the breakpoint context is still preserved for 15 minutes.
  - Queues need to have a [visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html) that is longer than the timeout of the subscribing Lambda function. If the visibility timeout is configured to less than 15 minutes, it'll be increased to 15 minutes as well.

### `build`

Build your app and synthesize your stacks.

Generates a `build/` directory with the compiled files and a `build/cdk.out/` directory with the synthesized CloudFormation stacks.

### `deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy a specific stack.

#### Options

In addition to the [global options](#global-options) below, the `deploy` command also takes:

- `--outputs-file`

  Pass in the `--outputs-file <filename>` option if you want to write the AWS CloudFormation stack outputs to a JSON file. Works the same way as the [`--outputs-file`](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#w108aac23b7c33c13) option in AWS CDK.

- `--rollback`

  By default `sst deploy` enables rollback on failure. This is so that any mistakes do not leave your infrastructure in an inconsistent state. To override this behavior, pass in `--rollback=false`

### `console`

This command launches the [SST Console](../console.md) to manage stages that are not running locally. It uses your local credentials (or the ones you specify) to make calls to AWS.

For more context; if you run [`sst start`](#start) and fire up the Console, you'll see the logs for the local invocations of your functions. Whereas with the `sst console` command, you'll see their [CloudWatch](https://aws.amazon.com/cloudwatch/) logs instead. This allows you to use the Console against your production or staging environments.

:::note
This command does not instrument your code. It simply uses your local credentials to make calls to AWS.
:::

#### Options

- `--stage`

The stage you want connect to. If this is not specified, it will default to your local stage.

Connecting to a different stage.

```bash
npx sst console --stage=staging
```

Using a different aws profile if your stage is in another AWS account.

```bash
npx sst console --stage=production --profile=acme-production
```

### `remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally remove a specific stack. Also removes the debug stack that might've been deployed along with `sst start`.

#### Options

In addition to the [global options](#global-options) below, the `remove` command also takes:

- `--debug-stack`

  Pass in the `--debug-stack` option if you want to remove the debug stack without removing stacks in the app. Note, that this option cannot be used when a stack is specified.

### `diff [stacks..]`

Compares the current version of the stacks in your app with the ones that've been deployed to AWS. This can be helpful in doing a quick check before deploying your changes to prod. You can also optionally compare a list of stacks.

```bash
# Compare all stacks
npx sst diff

# Compare a list of stacks
npx sst diff stack-posts stack-users
```

### `update`

A convenience command to update SST to the latest version. It also updates any CDK packages in your `package.json` to the version used by SST.

```bash
npx sst update
```

### `bind`

A convenience command to bind the resources to a script. This allows the [`@serverless-stack/node`](clients/index.md) helper library to work as if it was running inside a Lambda function.

So for example, you can bind all the resources in your app and use those to run your tests.

```bash
npx sst bind -- vitest run
```

You can [read more about how this works for testing](../testing.md).

### `secrets [action]`

Manage secrets in your app.

```bash
# Check the values of all the secrets
npx sst secrets list

# Check the value of a secret
npx sst secrets get STRIPE_KEY

# Set the value of a secret
npx sst secrets set STRIPE_KEY sk_test_abc123

# Unset the value of a secret
npx sst secrets remove STRIPE_KEY

# Set the fallback value of a secret
npx sst secrets set-fallback STRIPE_KEY sk_test_abc123

# Unset the fallback value of a secret
npx sst secrets remove-fallback STRIPE_KEY
```

:::note
The fallback value can only be inherited by stages deployed in the same AWS account and region. [Read more about fallback values](../config.md#fallback-values).
:::

#### Options

- `--format`

Format the secret names and values in the specified format. Only apply to the 'list' action. Currently only supports the dotenv format 'env'.

```bash
npx sst secrets list --format=env
```

### `bootstrap`

Deploys the SST Bootstrap stack into your AWS environment.

```bash
npx sst bootstrap
```

#### Options

- `--tags`

Tags to add for the Bootstrap stack.

```bash
npx sst bootstrap --tags key1=value1 key2=value2
```

### `add-cdk [packages..]`

Installs the given AWS CDK npm packages with the appropriate CDK version. This convenience method helps get around the [known CDK issue of version mismatches](known-issues.md). This command internally simply does and `npm install` or `yarn add`.

So instead of installing the CDK npm packages directly:

```bash
npm install @aws-cdk/aws-apigatewayv2-alpha
```

Use the `add-cdk` command instead.

```bash
npx sst add-cdk @aws-cdk/aws-apigatewayv2-alpha
```

Which in turn does:

```bash
npm install @aws-cdk/aws-apigatewayv2-alpha@x.x.x-alpha.0
```

Where `x.x.x` is the version of CDK that's being used internally. Note, that it'll use Yarn instead if it detects a `yarn.lock` file in your project.

#### Options

- `--dev`

  You can also pass in the `--dev` option if you need the packages to be installed as `devDependencies`.

### `cdk`

The SST CLI comes with a version of AWS CDK that it uses internally. This command gives direct access to it. To use this command you'll need to pass in the location of the CDK app. In our cases this is going to be generated in `build/run.js`. For example, to run the CDK `list` command you'll need to.

```bash
npx sst cdk --app=build/run.js list
```

### `telemetry`

SST [collects **completely anonymous** telemetry](../anonymous-telemetry.md) data about general usage.

You can opt-out of this if you'd not like to share any information.

```bash
npx sst telemetry disable
```

You can also re-enable telemetry if you'd like to re-join the program.

```bash
npx sst telemetry enable
```

## Global Options

### `--no-color`

Remove color and any style from the console outputs.

### `--verbose`

Shows more debug info in the console output. Setting the verbose option also sets the internal esbuild processes to `warning` instead of `error`.

### `--stage`

The stage you want to deploy to. If this is not specified, it will default to the stage configured during the initial run of the CLI.

### `--region`

The region you want to deploy to. Defaults to the one specified in your `sst.json`. Or uses `us-east-1`.

:::note
The `--stage` and `--region` options apply to the `start`, `build`, `deploy`, `remove`, and `secrets` commands.
:::

### `--profile`

The AWS profile you want to use for deployment. Defaults to the `default` profile in your AWS credentials file.

### `--role-arn`

ARN of the IAM Role to use when invoking CloudFormation. This role must be assumable by the AWS account being used.

This option applies to the `start`, `deploy`, and `remove` commands.

## AWS Profile

Specify the AWS account you want to deploy to by using the `--profile` option. If not specified, uses the default AWS profile. [Read more about AWS profiles here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html). For example:

```bash
npx sst deploy --profile=production
```

Where `production` is a profile defined locally in your `~/.aws/credentials`.

Or, use the `AWS_PROFILE` CLI environment variable

```bash
AWS_PROFILE=production npx sst deploy
```

## Package scripts

If you used the `create-sst` CLI to create your app, the above commands (`start`, `build`, `deploy`, and `remove`) are also available in your `package.json`. So you can run them using.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst <command>
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run <command>
```

</TabItem>
</MultiPackagerCode>

:::note
If you are using `npm run`, you'll need to add an extra `--` for the options.
:::

For example, to set the stage and region:

```bash
npx sst deploy --stage prod --region eu-west-1
```
