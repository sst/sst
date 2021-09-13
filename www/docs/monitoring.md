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

