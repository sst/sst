---
id: monitoring
title: Monitoring
sidebar_label: Monitoring
description: Monitoring Page
---

## Datadog

Datadog offers an [End-to-end Serverless Monitoring](https://www.datadoghq.com/product/serverless-monitoring/) solution that works well with AWS Lambda functions. The best way to integrate is by using the CDK construct they provide.

First add it to your project

```bash
# npm
npm i --save-dev datadog-cdk-constructs

# yarn
yarn add datadog-cdk-constructs
```

The integration requires you to import it into any stack where you have you have functions you want to monitor and attach it to each one.

```ts
import { Datadog } from "datadog-cdk-constructs"

const datadog = new Datadog(this, "Datadog", {
  apiKey: process.env.DATADOG_API_KEY,
})

datadog.addLambdaFunctions([myfunc])

```

For monitoring all functions attached to an [sst.Api](/constructs/Api) you can do the following
```ts
const myapi = new Api(...)
datadog.addLambdaFunctions(myapi.getFunctions())
```

## Sentry
Sentry offers [Serverless Error and Performance Monitoring](https://sentry.io/for/serverless/) for your functions. Integration is done at the application level with a function wrapper.

:::warning
Sentry's tracing integration will add latency to your functions as it needs to talk to their servers with each function call. We recommend using Sentry only for error reporting or turning down your sample rate to a low number.
:::


First add it to your project

```bash
# npm
npm i --save-dev @sentry/serverless

# yarn
yarn add @sentry/serverless
```

Then wrap a function you'd like to monitor. This example shows an API Gateway route handler

```ts
import Sentry from "@sentry/serverless"

Sentry.AWSLambda.init({
  dsn: 'https://<key>@sentry.io/<project>',
  tracesSampleRate: 0,
});

export const handler = Sentry.AWSLambda.wrapHandler(
  async (event: APIGatewayProxyEventV2, context, callback) => {
  }
)

```

## Epsagon
Epsagon is an end-to-end [Application Monitoring Service](https://epsagon.com/) and can monitor the full lifecycle of your serverless requests. To deploy go through Epsagon's on-boarding to first deploy their stack into your production AWS account. The lambda integration is done through a layer that is added to the functions you want to monitor.

To figure out the layer ARN, Epsagon provides [the following documentation](https://docs.epsagon.com/docs/aws-lambda-layer#using-epsagons-layers-in-lambda). Once you have that you can create the layer like this
```ts
import { LayerVersion } from "@aws-cdk/aws-lambda"

const epsagon = LayerVersion.fromLayerVersionArn(this, "EpsagonLayer", "<ARN>")
```

Then you can pass it to the layers function prop to monitor the function. Here is an example of monitoring all the functions in an API

```ts
new sst.Api(this, "Api", {
  defaultFunctionProps: {
    layers: [epsagon]
  }
})
```

## Lumigo
Lumigo offers a [Serverless Monitoring and Debugging Platform](https://lumigo.io/). To deploy go through Lumigo's on-boarding to first deploy their stack into your production AWS account. The lambda integration is done through a layer that is added to the functions you want to monitor.

To figure out the layer ARN, Lumigo provides [the following repository](https://github.com/lumigo-io/lumigo-node/tree/master/layers). Once you have that you can create the layer like this
```ts
import { LayerVersion } from "@aws-cdk/aws-lambda"

const lumigo = LayerVersion.fromLayerVersionArn(this, "LumigoLayer", "<ARN>")
```

Then you can pass it to the layers function prop to monitor the function. Here is an example of monitoring all the functions in an API

```ts
new sst.Api(this, "Api", {
  defaultFunctionProps: {
    layers: [lumigo]
  }
})
```
