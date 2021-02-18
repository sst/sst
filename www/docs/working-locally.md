---
id: working-locally
title: Working Locally
description: "Working on Lambda function Locally using Serverless Stack Toolkit (SST)"
---

SST comes with [a great local Lambda development environment](live-lambda-development.md) that allows you to work on and test your functions live.

## Local environment

Let's start the local development environment.

```bash
# With npm
npx sst start
# Or with Yarn
yarn sst start
```

The first time you run this, it'll deploy your app and a stack that sets up the debugger. This can take a couple of minutes.

## Making changes

The sample stack will deploy a Lambda function with an API endpoint. You'll see something like this in the output.

```bash
Outputs:
  ApiEndpoint: https://s8gecmmzxf.execute-api.us-east-1.amazonaws.com
```

If you head over to the endpoint, it'll invoke the Lambda function in `src/lambda.js`. You can try changing this file and hitting the endpoint again. You should **see your changes reflected right away**!

## Building your app

Once you are ready to build your app and convert your CDK code to CloudFormation, run the following from your project root.

```bash
# With npm
npx sst build
# Or with Yarn
yarn sst build
```

This will compile your ES (or TS) code to the `.build/` directory in your app. And the synthesized CloudFormation templates are outputted to `.build/cdk.out/`. Note that, you shouldn't commit the `.build/` directory to source control and it's ignored by default in your project's `.gitignore`.

## Testing your app

You can run your tests using.

```bash
# With npm
npm test
# Or with Yarn
yarn test
```

Internally, SST uses [Jest](https://jestjs.io/). You'll just need to add your tests to the `test/` directory.

## Linting & type checking

Your code is automatically linted when building or deploying. If you'd like to customize the lint rules, add a `.eslintrc.json` in your project root.

Note that, using the `.eslintignore` file is not currently supported. If you'd like to turn off linting, set `"lint": false` in your `sst.json`.

If you want to ignore specific files, use the [`ignorePatterns`](https://eslint.org/docs/user-guide/configuring/ignoring-code#ignorepatterns-in-config-files) option in your `.eslintrc.json`.

```json
{
  "ignorePatterns": ["temp.js", "**/vendor/*.js"],
  "rules": {
    //...
  }
}
```

If you are using TypeScript, SST also runs a separate TypeScript process to type check your code. It uses the `tsconfig.json` in your project root for this. This applies to the Lambda functions in your app as well.
