# @serverless-stack/cli [![npm](https://img.shields.io/npm/v/@serverless-stack/cli.svg)](https://www.npmjs.com/package/@serverless-stack/cli)

Part of the **[Serverless Stack Toolkit](https://github.com/serverless-stack/serverless-stack)**. The `sst` CLI allows you to build, deploy, test, and remove Serverless Stack apps.

## Installation

While it can be installed globally, it's recommended to install it locally in your project instead.

```bash
# With npm
$ npm install @serverless-stack/cli --save-exact
# Or with Yarn
$ yarn add @serverless-stack/cli --exact
```

## Usage

Once installed locally, you can run the commands using.

```bash
# With npm
$ npx sst <command>
# Or with Yarn
$ yarn sst <command>
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

`sst start` also starts up a watcher to transpile (using [esbuild](https://esbuild.github.io)), lint (with [ESLint](http://eslint.org)), and type check (using [TypeScript](https://www.typescriptlang.org)) your Lambda functions. So you can use ES or TypeScript directly.

### `build`

Build your app and synthesize your stacks.

Generates a `build/` directory with the compiled files and a `build/cdk.out/` directory with the synthesized CloudFormation stacks.

### `deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy a specific stack.

### `remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally remove a specific stack. Also removes the debug stack that might've been deployed along with `sst start`.

### `add-cdk [packages..]`

Installs the given AWS CDK npm packages with the appropriate CDK version. This convenience method helps get around the [known CDK issue of version mismatches](https://github.com/serverless-stack/serverless-stack#cdk-version-mismatch). This command internally simply does and `npm install` or `yarn add`.

So instead of installing the CDK npm packages directly:

```bash
$ npm install @aws-cdk/aws-s3 @aws-cdk/aws-iam
```

Use the `add-cdk` command instead.

```bash
$ npx sst add-cdk @aws-cdk/aws-s3 @aws-cdk/aws-iam
```

Which in turn does:

```bash
$ npm install @aws-cdk/aws-s3@x.x.x @aws-cdk/aws-iam@x.x.x
```

Where `x.x.x` is the version of CDK that's being used internally. Note, that it'll use Yarn instead if it detects a `yarn.lock` file in your project.

#### Options

- `--dev`

  You can also pass in the `--dev` option if you need the packages to be installed as `devDependencies`.

### `test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

### `cdk`

The sst CLI comes with [a forked version of AWS CDK](https://github.com/serverless-stack/aws-cdk) that it uses internally. This command gives direct access to it. To use this command you'll need to pass in the location of the CDK app. In our cases this is going to be generated in `build/run.js`. For example, to run the CDK `list` command you'll need to.

```bash
$ npx sst cdk --app=build/run.js list
```

## Options

### `--stage`

The stage you want to deploy to. Defaults to the one specified in your `sst.json`. Or uses `dev`.

### `--region`

The region you want to deploy to. Defaults to the one specified in your `sst.json`. Or uses `us-east-1`.

## AWS Profile

Specify the AWS account you want to deploy to by using the `AWS_PROFILE` CLI environment variable. If not specified, uses the default AWS profile. [Read more about AWS profiles here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html). For example:

```bash
$ AWS_PROFILE=production npx sst deploy
```

Where `production` is a profile defined locally in your `~/.aws/credentials`.
