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

This covers the case where you have a package or file that you'd like to upload as a Lambda Layer.

Say you wanted to use the [sharp package](https://www.npmjs.com/package/sharp) in your code and wanted to use the [sharp Layer](https://github.com/Umkus/lambda-layer-sharp/releases) in your Lambda function when deployed.

1. Install the [sharp package](https://www.npmjs.com/package/sharp) in your app.

   ```bash
   npm install sharp
   ```

2. Create a layer folder in your app and copy the [sharp layer](https://github.com/Umkus/lambda-layer-sharp/releases) to it.

   ```bash
   mkdir -p layers/sharp
   cd layers/sharp
   ```

   Unzip the packaged layer to this directory.

3. Configure your `sst.Function` to:

   - Set `sharp` as an external module, so it's not bundled in the Lambda code.
   - And, define a Layer pointing to `layers/sharp` (**not** `layers/sharp/nodejs`).

   For example:

   ```js
   import * as lambda from "@aws-cdk/aws-lambda";

   new sst.Function(this, "Function", {
     handler: "src/lambda.main",
     bundle: {
       externalModules: ["sharp"],
     },
     layers: [
       new lambda.LayerVersion(this, "MyLayer", {
         code: lambda.Code.fromAsset("layers/sharp"),
       }),
     ],
   });
   ```

#### 2. Use node_modules from an external Layer

On the other hand, there is the case where the Layer you want to use is already available in AWS.

Say you wanted to use the [chrome-aws-lambda-layer](https://github.com/shelfio/chrome-aws-lambda-layer) that's already deployed to AWS. Along with the [chrome-aws-lambda](https://github.com/alixaxel/chrome-aws-lambda) npm package.

1. Install the [npm package](https://github.com/alixaxel/chrome-aws-lambda).

   ```bash
   npm install chrome-aws-lambda
   ```

2. Configure your `sst.Function` to:

   - Set `chrome-aws-lambda` as an external module, so it's not bundled in the Lambda function code.
   - And point to the [existing Layer](https://github.com/shelfio/chrome-aws-lambda-layer).

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

For further details, [read the example on this use case](https://serverless-stack.com/examples/how-to-use-lambda-layers-in-your-serverless-app.html) and [check out the sample SST app](https://github.com/serverless-stack/examples/tree/main/layer-chrome-aws-lambda).
