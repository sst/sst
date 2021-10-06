---
id: monitoring-your-app-in-prod
title: Monitoring Your App in Prod
sidebar_label: Monitoring Your App in Prod
description: "How to use services like Datadog, Sentry, Epsagon, and Lumigo to monitor the Lambda functions in your SST app in production."
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

Once your app has been [deployed to production](deploying-your-app.md), it's useful to be able to monitor your Lambda functions. There are a few different services that you can use for this. We'll look at them below.

## Datadog

Datadog offers an [End-to-end Serverless Monitoring](https://www.datadoghq.com/product/serverless-monitoring/) solution that works with Lambda functions. The best way to integrate is by using the [CDK construct](https://github.com/DataDog/datadog-cdk-constructs) they provide.

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
  apiKey: "<DATADOG_API_KEY>"
});

datadog.addLambdaFunctions([myfunc]);
```

To monitor all the functions in a stack, you can use the Stack construct's [`getAllFunctions`](constructs/Stack.md#getallfunctions) method and do the following at the bottom of your stack definition.

```js
datadog.addLambdaFunctions(this.getAllFunctions());
```

For more details, [check out the Datadog docs](https://docs.datadoghq.com/serverless/installation/nodejs/?tab=awscdk).

## Sentry

Sentry offers [Serverless Error and Performance Monitoring](https://sentry.io/for/serverless/) for your Lambda functions. Integration is done at the application level with a function wrapper.

:::warning
Sentry's tracing integration will add latency to your functions as it needs to talk to their servers with each function call. We recommend using Sentry only for error reporting or turning down your sample rate to a low number.
:::

First add it to your project.

```bash
# npm
npm install --save-dev @sentry/serverless

# Yarn
yarn add --dev @sentry/serverless
```

Then wrap a function you'd like to monitor.

<MultiLanguageCode>
<TabItem value="js">

```js
import Sentry from "@sentry/serverless";

Sentry.AWSLambda.init({
  tracesSampleRate: 0,
  dsn: "https://<key>@sentry.io/<project>",
});

export const handler = Sentry.AWSLambda.wrapHandler(
  async (event, context) => {
    // Add Lambda function code 
  }
);
```

</TabItem>
<TabItem value="ts">

```ts
import Sentry from "@sentry/serverless";

Sentry.AWSLambda.init({
  tracesSampleRate: 0,
  dsn: "https://<key>@sentry.io/<project>",
});

export const handler = Sentry.AWSLambda.wrapHandler(
  async (event: APIGatewayProxyEventV2, context) => {
    // Add Lambda function code 
  }
);
```

</TabItem>
</MultiLanguageCode>

For more details, [check out the Sentry docs](https://docs.sentry.io/platforms/node/guides/aws-lambda/).

## Epsagon

Epsagon is an end-to-end [Application Monitoring Service](https://epsagon.com/) and can monitor the full lifecycle of your serverless requests.

To get started, [sign up for an Epsagon account](https://app.epsagon.com/signup). [Deploy their stack](https://docs.epsagon.com/docs/getting-started/integrating-environments/aws) in your production AWS account. Then to enable Lambda monitoring, add a layer to the functions you want to monitor.

To figure out the layer ARN, [follow these steps](https://docs.epsagon.com/docs/getting-started/monitoring-applications/aws-lambda-layer) from the Epsagon docs.

With the layer ARN, you can use the layer construct in your CDK code.

```js
import { LayerVersion } from "@aws-cdk/aws-lambda";

const epsagon = LayerVersion.fromLayerVersionArn(this, "EpsagonLayer", "<ARN>");
```

You can then set it for all the functions in your stack using the [`addDefaultFunctionLayers`](constructs/Stack.md#adddefaultfunctionlayers) and [`addDefaultFunctionEnv`](constructs/Stack.md#adddefaultfunctionenv).

```js
stack.addDefaultFunctionLayers([epsagon])
stack.addDefaultFunctionEnv({
  EPSAGON_TOKEN: "<token>",
  EPSAGON_APP_NAME: "<app_name>",
  NODE_OPTIONS: "-r epsagon-frameworks"
})
```

For more details, [check out the Epsagon docs](https://docs.epsagon.com/docs/welcome/what-is-epsagon).

## Lumigo

Lumigo offers a [Serverless Monitoring and Debugging Platform](https://lumigo.io/).

To get started, [sign up for an account](https://platform.lumigo.io/signup). Then [follow their wizard](https://platform.lumigo.io/wizard) to deploy their stack in your AWS production account. Then to enable Lambda monitoring, add a layer to the functions you want to monitor.

To figure out the layer ARN, [use this repository](https://github.com/lumigo-io/lumigo-node/tree/master/layers).

With the layer ARN, you can use the layer construct in your CDK code.

```js
import { LayerVersion } from "@aws-cdk/aws-lambda";

const lumigo = LayerVersion.fromLayerVersionArn(this, "LumigoLayer", "<ARN>");
```

You can then set it for all the functions in your stack using the [`addDefaultFunctionLayers`](constructs/Stack.md#adddefaultfunctionlayers) and [`addDefaultFunctionEnv`](constructs/Stack.md#adddefaultfunctionenv).

```js
stack.addDefaultFunctionLayers([layers])
stack.addDefaultEnv({
  LUMIGO_TRACER_TOKEN: "<token>",
  AWS_LAMBDA_EXEC_WRAPPER: "/opt/lumigo_wrapper"
})
```

For more details, [check out the Lumigo docs](https://docs.lumigo.io/docs).
