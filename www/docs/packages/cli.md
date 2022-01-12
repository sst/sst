---
title: "@serverless-stack/cli"
description: "Docs for the @serverless-stack/cli package"
---

The SST CLI (`@serverless-stack/cli`) allows you to build, deploy, test, and remove Serverless Stack apps.

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

#### The basic commands

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
- Then get the list of files that've been edited/added as detected by esbuild.
- It'll run [ESLint](https://eslint.org) on these files in a separate thread.
- And if there are any TS files that've been affected, it'll type check them using [TypeScript](https://www.typescriptlang.org). This is also done in a separate thread.

Thanks to esbuild and this build process, the changes are reflected as fast as possible. And by blocking the incoming requests, you can be sure that the most recent changes are reflected. Also, running the lint and type checking processes in separate threads, makes sure that it doesn't interfere with the main build process.

#### CDK builds

The above steps apply to the Lambda functions in your app. For the CDK code in your app, SST will automatically watch for changes and rebuild it but it won't deploy them.

Instead, it'll first compare the generated CloudFormation template to the previously built one. If there are new infrastructure changes, it'll prompt you to _press ENTER_ to deploy them. And once you do, it'll deploy your new infrastructure.

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

### `remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally remove a specific stack. Also removes the debug stack that might've been deployed along with `sst start`.

### `diff [stacks..]`

Compares the current version of the stacks in your app with the ones that've been deployed to AWS. This can be helpful in doing a quick check before deploying your changes to prod. You can also optionally compare a list of stacks.

``` bash
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

### `add-cdk [packages..]`

Installs the given AWS CDK npm packages with the appropriate CDK version. This convenience method helps get around the [known CDK issue of version mismatches](known-issues.md). This command internally simply does and `npm install` or `yarn add`.

So instead of installing the CDK npm packages directly:

```bash
npm install @aws-cdk/aws-s3 @aws-cdk/aws-iam
```

Use the `add-cdk` command instead.

```bash
npx sst add-cdk @aws-cdk/aws-s3 @aws-cdk/aws-iam
```

Which in turn does:

```bash
npm install @aws-cdk/aws-s3@x.x.x @aws-cdk/aws-iam@x.x.x
```

Where `x.x.x` is the version of CDK that's being used internally. Note, that it'll use Yarn instead if it detects a `yarn.lock` file in your project.

#### Options

- `--dev`

  You can also pass in the `--dev` option if you need the packages to be installed as `devDependencies`.

### `test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

#### Options

- `--stage`

The stage you want to test against. If this is not specified, it will default to `dev`.

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
The `--stage` and `--region` options apply to the `start`, `build`, `deploy`, and `remove` commands.
:::

### `--role-arn`

ARN of the IAM Role to use when invoking CloudFormation. If not specified, the default AWS profile, or the profile specified in the `AWS_PROFILE` environment variable will be used.

This option applies to the `start`, `deploy`, and `remove` commands.

## AWS Profile

Specify the AWS account you want to deploy to by using the `AWS_PROFILE` CLI environment variable. If not specified, uses the default AWS profile. [Read more about AWS profiles here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html). For example:

```bash
AWS_PROFILE=production npx sst deploy
```

Where `production` is a profile defined locally in your `~/.aws/credentials`.

## Package scripts

If you used the `create-serverless-stack` CLI to create your app, the above commands (`start`, `build`, `deploy`, and `remove`) are also available in your `package.json`. So you can run them using.

```bash
# With npm
npm run <command>
# Or with Yarn
yarn run <command>
```

:::note
If you are using `npm run`, you'll need to add an extra `--` for the options.
:::

For example, to set the stage and region:

```bash
npm run deploy -- --stage prod --region eu-west-1
```
