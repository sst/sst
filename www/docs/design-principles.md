---
title: Design Principles
description: "SST is built around a few core design principles."
---

import config from "../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST is built around a few core design principles that make it perfect for growing teams.

</HeadlineText>

Here we'll look at how SST can be both easy to get started and yet completely customizable.

---

## Zero-config

One of the big reasons we built SST was because the development environment for serverless always felt lacking.

It lacked a tight feedback loop, something the [Live Lambda Development](live-lambda-development.md) addresses. But you also needed to configure multiple plugins, Webpack, Babel, TypeScript, testing frameworks, linters etc. These setups were often brittle and relied on separate project maintainers to keep them up to date.

This might've been fine if you are an individual developer who has a ton of experience with serverless. But if you are a part of a larger team or are just getting started, it can be very challenging just to get your dev environment up and running.

Hence, one of the design principles of SST is to make sure that it works out of the box. It comes _**batteries included**_, making it easy to get started.

You can learn more about this if you [check out our tutorial](learn/index.md).

---

## Progressive disclosure

A big issue with building on AWS is that it is very complicated. It can be really intimidating to learn AWS. But SST's design makes this a lot easier.

[SST's constructs](constructs/index.md) are based on the idea of [_progressive disclosure_](https://en.wikipedia.org/wiki/Progressive_disclosure). This means that the basic configuration for these constructs are simple, easy to understand, and readable. But they still allow you to **progressively customize** them for more complex use cases.

Let's look at two areas where we apply this idea.

---

#### Configuring constructs

The [`Api`](constructs/Api.md) construct for example, in its simplest form only needs the routes and the function handlers as strings.

```js
new Api(this, "Api", {
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});
```

This format makes it easy to understand what is being defined. But if you wanted to customize the function properties, you could:

```js {2-7}
new Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      bind: [table],
    },
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

We could go even further and specifically customize one of the routes.

```js {9-14}
new Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      bind: [table],
    },
  },
  routes: {
    "GET /notes": {
      function: {
        handler: "src/list.main",
        bind: [table],
      },
    },
    "POST /notes": "create.main",
  },
});
```

Finally, you can configure the props of the underlying CDK construct that the `Api` construct uses.

```ts {4-11}
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(stack, "Api", {
  cdk: {
    httpStages: [
      {
        stageName: "dev",
        autoDeploy: false,
      },
    ],
  },
});
```

---

#### Attaching permissions

A similar idea can be seen in the pattern SST uses for attaching permissions to functions.

Let's look at the [`Cron`](constructs/Cron.md) construct as an example.

```js
const cron = new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});
```

For simplicity's sake we could give the cronjob function access to everything.

```js
cron.attachPermissions(PermissionType.ALL);
```

Or just give it access to a type of resource.

```js
cron.attachPermissions(["s3"]);
```

Or to a specific construct that we created.

```js {3}
const table = new Table(this, "Table");

cron.attachPermissions(["s3", table]);
```

Or grant a specific permission for a construct.

```js {4-7}
const topic = new sns.Topic(this, "Topic");
const table = new Table(this, "Table");

cron.attachPermissions([
  [topic, "grantPublish"],
  [table, "grantReadData"],
]);
```

Or attach a list of granular IAM policy statements.

```js {4-8}
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

cron.attachPermissions([
  new PolicyStatement({
    actions: ["execute-api:Invoke"],
    effect: Effect.ALLOW,
    resources: [`arn:aws:execute-api:${region}:${account}:${api.httpApiId}/*`],
  }),
]);
```

This allows you to customize as you go along, as opposed to being overwhelmed by all the options up front.

---

## Having an escape hatch

That said, you might run into cases where you are trying to do something that a construct does not support. In these cases, you can fallback to using the native CDK constructs instead.

This _escape hatch_ ensures that you are **not locked into** using SST's constructs. This is one of the biggest reasons companies choose SST.

PS: If you have a use case that we should address, jump on our <a href={ config.discord }>Discord</a> and let us know!
