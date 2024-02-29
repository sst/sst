---
title: Lambda Layers
description: "Using Lambda Layers in SST."
---

There are 2 common use cases for Lambda Layers. If your use case is not supported, feel free to open a new issue.

## 1. Packaging node_modules into a Layer

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
   import * as lambda from "aws-cdk-lib/aws-lambda";

   new sst.Function(stack, "Function", {
     handler: "src/lambda.main",
     nodejs: {
       esbuild: {
        external: ["sharp"],
       },
     },
     layers: [
       new lambda.LayerVersion(stack, "MyLayer", {
         code: lambda.Code.fromAsset("layers/sharp"),
       }),
     ],
   });
   ```

## 2. Use node_modules from an external Layer

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
   import * as lambda from "aws-cdk-lib/aws-lambda";

   const layerArn =
     "arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:22";

   new sst.Function(stack, "Function", {
     handler: "src/lambda.main",
     nodejs: {
       esbuild: {
        external: ["chrome-aws-lambda"],
       },
     },
     layers: [
       lambda.LayerVersion.fromLayerVersionArn(stack, "ChromeLayer", layerArn),
     ],
   });
   ```

For further details, [read the example on this use case](https://sst.dev/examples/how-to-use-lambda-layers-in-your-serverless-app.html) and [check out the sample SST app](https://github.com/sst/examples/tree/main/layer-chrome-aws-lambda).
