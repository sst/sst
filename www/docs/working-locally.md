---
title: Working Locally
description: "Working on Lambda function Locally using Serverless Stack (SST)"
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

For JavaScript and TypeScript apps, SST will automatically lint your code when building or deploying. If you'd like to customize the lint rules, add a `.eslintrc.json` in your project root.

Note that, using the `.eslintignore` file is not currently supported. If you'd like to turn off linting, set `"lint": false` in your `sst.json`.

If you want to ignore specific files, use the [`ignorePatterns`](https://eslint.org/docs/user-guide/configuring/ignoring-code#ignorepatterns-in-config-files) option in your `.eslintrc.json`.

```json {2}
{
  "ignorePatterns": ["temp.js", "**/vendor/*.js"],
  "rules": {
    //...
  }
}
```

If you are using TypeScript, SST also runs a separate TypeScript process to type check your code. It uses the `tsconfig.json` in your project root for this. This applies to the Lambda functions in your app as well.

#### Disabling linting and type checking

You can also disable linting and type checking using the `sst.json`.

```json title="sst.json" {5-6}
{
  "name": "my-sst-app",
  "stage": "dev",
  "region": "us-east-1",
  "lint": false,
  "typeCheck": false
}
```

## Using Lambda Layers

There are 2 common use cases for Lambda Layers. If your use case is not supported, feel free to open a new issue.

#### 1. Packaging node_modules into a Layer

This is currently supported in SST.

For example, say you wanted to use the [chrome-aws-lambda](https://github.com/alixaxel/chrome-aws-lambda) package in your code:

```js
import chromium from "chrome-aws-lambda";
```

This means that you want to package `chrome-aws-lambda` into a Layer and not bundle it in your Lambda code. To do this you'll need to:

1. Install the package in your app

   ```bash
   npm install chrome-aws-lambda
   ```

2. Create a layer folder in your app and install the package in there again

   ```bash
   mkdir -p layer/nodejs
   cd layer/nodejs
   npm install chrome-aws-lambda
   ```

3. Configure your `sst.Function` to:

   - Set `chrome-aws-lambda` as an external module, so it's not bundled in the Lambda code
   - And, define a Layer pointing to `layer` (**not** `layer/nodejs`)

   For example:

   ```js
   import * as lambda from "@aws-cdk/aws-lambda";

   new sst.Function(this, "Function", {
     handler: "src/lambda.main",
     bundle: {
       externalModules: ["chrome-aws-lambda"],
     },
     layers: [
       new lambda.LayerVersion(this, "MyLayer", {
         code: lambda.Code.fromAsset("path/to/layer"),
       }),
     ],
   });
   ```

#### 2. Use node_modules from an external Layer

This use case is also supported in SST. You can find [a working repo here](https://github.com/serverless-stack/examples/tree/main/layer-chrome-aws-lambda).

For example, if you wanted to use the [chrome-aws-lambda-layer](https://github.com/shelfio/chrome-aws-lambda-layer); you can.

1. Find the packages that come with the Layer. In this case, it is the [chrome-aws-lambda](https://github.com/alixaxel/chrome-aws-lambda) package. Install the package in your app.

   ```bash
   npm install chrome-aws-lambda
   ```

2. Configure your `sst.Function` to:

   - Set `chrome-aws-lambda` as an external module, so it's not bundled in the Lambda function code
   - And point to the Layer

   For example:

   ```js
   import * as lambda from "@aws-cdk/aws-lambda";

   const layerArn =
     "arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:22";

   new sst.Function(this, "Function", {
     handler: "src/lambda.main",
     bundle: {
       externalModules: ["chrome-aws-lambda"],
     },
     layers: [
       lambda.LayerVersion.fromLayerVersionArn(this, "ChromeLayer", layerArn),
     ],
   });
   ```
