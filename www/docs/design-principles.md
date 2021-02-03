---
id: design-principles
title: Design Principles
description: "Serverless Stack Toolkit (SST) is designed a few core principles."
---

import config from "../config";

Serverless Stack Toolkit (SST) is designed a few core principles.

## Progressive disclosure

The constructs that SST provides for building serverless apps is based on the idea of [_progressive disclosure_](https://en.wikipedia.org/wiki/Progressive_disclosure). This means that the basic configuration for these constructs are simple, easy to understand, and readable. But they still allow you to progressively customize them for increasingly complex use cases.

Let's look at the two areas where we apply this idea.

### Configuring constructs

The [`Api`](constructs/api.md) construct for example, in its simplest form only needs the routes and the function handlers as strings.

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
  functionProps: {
    srcPath: "src/",
    environment: { tableName: table.tableName },
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

We could go further and customize one of the routes.

```js {7-12}
new Api(this, "Api", {
  functionProps: {
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

To take it a set further, we can manually create the [`HttpApi`](constructs/api.md#httpapi-1) construct.

### Attaching permissions

A similar idea can be seen in the pattern SST uses for attaching permissions to functions.

Let's look at a cronjob as an example.

```js
const cron = new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});
```

For simplicity's sake we could give the cronjob function access to everything.

```js
cron.attachPermissions("*");
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
const sns = new sns.Topic(this, "Topic");
const table = new Table(this, "Table");

cron.attachPermissions([
  [topic, "grantPublish"],
  [table, "grantReadData"],
]);
```

With the design in these above examples, we'd love to hear your feedback. Feel free to <a href={ config.slack }>join us on Slack</a> or <a href={ `mailto:${config.email}` }>contact us via email</a>.

Finally, you can completely opt out of using the higher-level SST constructs and use CDK directly. This _escape hatch_ ensures that you aren't locked in to using SST's constructs.

## Works out of the box

One of the big reasons we built SST was because the development environment for serverless always felt lacking. It lacked a tight feedback loop, something the [Live Lambda Development](live-lambda-development.md) tries to address. But you also needed to configure multiple plugins, setup Webpack, Babel or TypeScript, testing frameworks, etc. These setups were often brittle and relied on separate projects maintainers to keep up to date. This might be fine if you are an individual developer who has a ton of experience with serverless. But if you are a part of a larger team or are just getting started with serverless, it can be very challenging just to get your dev environment up and running.

A big driving principle of SST is to make sure that the development environment works out of the box, comes with _batteries included_, and needs little to no configuration.
