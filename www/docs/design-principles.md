---
id: design-principles
title: Design Principles
description: "SST is designed around a few core principles."
---

import config from "../config";

SST is designed around a few core principles.

## Progressive disclosure

The [constructs that SST provides](packages/resources.md) for building serverless apps is based on the idea of [_progressive disclosure_](https://en.wikipedia.org/wiki/Progressive_disclosure). This means that the basic configuration for these constructs are simple, easy to understand, and readable. But they still allow you to progressively customize them for more complex use cases.

Let's look at the two areas where we apply this idea.

### Configuring constructs

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

```js {2-5}
new Api(this, "Api", {
  defaultFunctionProps: {
    srcPath: "src/",
    environment: { tableName: table.tableName },
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

We could go even further and specifically customize one of the routes.

```js {7-12}
new Api(this, "Api", {
  defaultFunctionProps: {
    srcPath: "src/",
    environment: { tableName: table.tableName },
  },
  routes: {
    "GET /notes": {
      function: {
        handler: "list.main",
        srcPath: "services/functions/",
      },
    },
    "POST /notes": "create.main",
  },
});
```

### Attaching permissions

A similar idea can be seen in the pattern SST uses for attaching permissions to functions.

Let's look at a [cronjob](constructs/Cron.md) as an example.

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

```js {4-10}
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

cron.attachPermissions([
  new PolicyStatement({
    actions: ["execute-api:Invoke"],
    effect: Effect.ALLOW,
    resources: [`arn:aws:execute-api:${region}:${account}:${api.httpApiId}/*`],
  }),
]);
```

### Having an escape hatch

We are continually working to improve the design of the SST constructs. Feel free to send us your feedback <a href={ config.discord }>via Discord</a> or <a href={ `mailto:${config.email}` }>email</a>.

That said, you might run into cases where you are trying to do something that these constructs do not support. In these cases, you can fallback to using the native CDK constructs instead. This _escape hatch_ ensures that you won't be locked in to using SST's constructs.

## Zero-config

One of the big reasons we built SST was because the development environment for serverless always felt lacking. It lacked a tight feedback loop, something the [Live Lambda Development](live-lambda-development.md) tries to address. But you also needed to configure multiple plugins, Webpack, Babel, TypeScript, testing frameworks, linters etc. These setups were often brittle and relied on separate project maintainers to keep up to date. This might've been fine if you are an individual developer who has a ton of experience with serverless. But if you are a part of a larger team or are just getting started with serverless, it can be very challenging just to get your dev environment up and running.

Hence, one of the design principles of SST is to make sure that the development environment works out of the box. It comes _batteries included_. And needs little to no configuration.
