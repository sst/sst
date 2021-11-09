---
id: monitoring-your-app-in-prod
title: Monitoring Your App in Prod
sidebar_label: Monitoring Your App in Prod
description: "How to use services like Datadog, Sentry, Epsagon, and Lumigo to monitor the Lambda functions in your SST app in production."
---

Once your app has been [deployed to production](deploying-your-app.md), it's useful to be able to monitor your Lambda functions. There are a few different services that you can use for this. We'll look at them below.

## Datadog

[Datadog](https://www.datadoghq.com) offers an [End-to-end Serverless Monitoring](https://www.datadoghq.com/product/serverless-monitoring/) solution that works with Lambda functions. The best way to integrate is by using the [CDK construct](https://github.com/DataDog/datadog-cdk-constructs) they provide.

Start by adding it to your project.

```bash
# npm
npm install --save-dev datadog-cdk-constructs

# Yarn
yarn add --dev datadog-cdk-constructs
```

Next, you'll need to import it into a stack. Add pass in the functions you want monitored.

```js
import { Datadog } from "datadog-cdk-constructs";

const datadog = new Datadog(this, "Datadog", {
  nodeLayerVersion: 65,
  extensionLayerVersion: 13,
  apiKey: "<DATADOG_API_KEY>",
});

datadog.addLambdaFunctions([myfunc]);
```

To monitor all the functions in a stack, you can use the Stack construct's [`getAllFunctions`](constructs/Stack.md#getallfunctions) method and do the following at the bottom of your stack definition.

```js
datadog.addLambdaFunctions(this.getAllFunctions());
```

For more details, [check out the Datadog docs](https://docs.datadoghq.com/serverless/installation/nodejs/?tab=awscdk).

## Sentry

[Sentry](https://sentry.io) offers [Serverless Error Monitoring](https://sentry.io/for/serverless/) for your Lambda functions. Integration is done through a Lambda Layer.

Head over to the [Layer that Sentry provides](https://docs.sentry.io/platforms/node/guides/aws-lambda/layer/), select your region and copy the layer ARN.

Then add the Layer to your stack.

```js
import { LayerVersion } from "@aws-cdk/aws-lambda";

const sentry = LayerVersion.fromLayerVersionArn(
  this,
  "SentryLayer",
  `arn:aws:lambda:${scope.region}:943013980633:layer:SentryNodeServerlessSDK:34`
);
```

You can then set it for all the functions in your stack using the [`addDefaultFunctionLayers`](constructs/Stack.md#adddefaultfunctionlayers) and [`addDefaultFunctionEnv`](constructs/Stack.md#adddefaultfunctionenv). Note we only want to enable this when the function is deployed, not when using [Live Lambda Dev](live-lambda-development.md).

```js
if (!scope.local) {
  stack.addDefaultFunctionLayers([layer]);
  stack.addDefaultFunctionEnv({
    SENTRY_DSN: "<SENTRY_DSN>",
    NODE_OPTIONS: "-r @sentry/serverless/dist/awslambda-auto"
  });
}
```

Sentry also offers performance monitoring for serverless. To enable, add the `SENTRY_TRACES_SAMPLE_RATE` environment variable.

```js {3}
stack.addDefaultFunctionEnv({
  SENTRY_DSN: "<SENTRY_DSN>",
  SENTRY_TRACES_SAMPLE_RATE: "1.0",
  NODE_OPTIONS: "-r @sentry/serverless/dist/awslambda-auto"
});
```

This can be tuned between the values of 0 and 1. Where 0 means that no performance related information is sent, and 1 means that information for all the invocations are sent. This should be tuned based on the volume of invocations and the amount of transactions available in your Sentry account. A value of 0.5 should work for most projects.

You also need to wrap your function handlers.

```js
import Sentry from "@sentry/serverless";

export const handler = Sentry.AWSLambda.wrapHandler(async (event) => {
  ...
});
```

For more details, [check out the Sentry docs](https://docs.sentry.io/platforms/node/guides/aws-lambda/).

## Epsagon

:::caution

Epsagon is undergoing some changes after the acquisition by Cisco. We recommend using one of the other monitoring services.

:::

[Epsagon](https://epsagon.com) is an end-to-end [Application Monitoring Service](https://epsagon.com/) and can monitor the full lifecycle of your serverless requests.

The Epsagon docs on [using a Lambda Layer](https://docs.epsagon.com/docs/getting-started/monitoring-applications/aws-lambda-layer) are incorrect. You'll need to install the Epsagon agent for your Lambda functions.

``` bash
npm install epsagon
```

And wrap your Lambda functions with their tracing wrapper.

``` js
const handler = epsagon.lambdaWrapper(function(event, context) {
  // Lambda code
});

export { handler };
```

## Lumigo

[Lumigo](https://lumigo.io) offers a [Serverless Monitoring and Debugging Platform](https://lumigo.io/).

To get started, [sign up for an account](https://platform.lumigo.io/signup). Then [follow their wizard](https://platform.lumigo.io/wizard) to deploy their stack in your AWS production account. Then to enable Lambda monitoring, add a `lumigo:auto-trace` tag to the functions with the value `true`.

```js
import * as cdk from "@aws-cdk/core";

cdk.Tags.of(this).add("lumigo:auto-trace", "true", {
  includeResourceTypes: ["AWS::Lambda::Function"]
});
```

For more details, [check out the Lumigo docs on auto-tracing](https://docs.lumigo.io/docs/auto-instrumentation#auto-tracing-with-aws-tags).

## Thundra

[Thundra](https://thundra.io) offers [Thundra APM - Application Performance Monitoring for Serverless and Containers](https://thundra.io/apm).

To get started, [sign up for an account](https://console.thundra.io/landing/). Then [follow the steps in the quick start guide](https://apm.docs.thundra.io/getting-started/quick-start-guide/connect-thundra) to deploy their stack into the AWS account you wish to monitor. Then to enable Lambda monitoring, add a layer to the functions you want to monitor.

To figure out the layer ARN for the latest version, [check the badge here](https://apm.docs.thundra.io/node.js/nodejs-integration-options).

With the layer ARN, you can use the layer construct in your CDK code.

```ts
import { LayerVersion } from "@aws-cdk/aws-lambda";

const thundraLayer = LayerVersion.fromLayerVersionArn(this, "ThundraLayer", "<ARN>");
```

You can then set it for all the functions in your stack using the [`addDefaultFunctionLayers`](constructs/Stack.md#adddefaultfunctionlayers) and [`addDefaultFunctionEnv`](constructs/Stack.md#adddefaultfunctionenv). Note we only want to enable this when the function is deployed, not in [Live Lambda Dev](live-lambda-development.md) as the layer will prevent the debugger from connecting.

```js
if (!scope.local) {
  const thundraAWSAccountNo = 269863060030;
  const thundraNodeLayerVersion = 94; // Latest version at time of writing
  const thundraLayer = LayerVersion.fromLayerVersionArn(
    this,
    'ThundraLayer',
    `arn:aws:lambda:${scope.region}:${thundraAWSAccountNo}:layer:thundra-lambda-node-layer:${thundraNodeLayerVersion}`,
  );
  this.addDefaultFunctionLayers([thundraLayer]);
  
  this.addDefaultFunctionEnv({
    THUNDRA_APIKEY: process.env.THUNDRA_API_KEY,
    NODE_OPTIONS: "-r @thundra/core/dist/bootstrap/lambda";
  });
}
```

For more details, [check out the Thundra docs](https://apm.docs.thundra.io/).
