---
id: faq
title: Frequently Asked Questions
description: "Frequently asked questions about Serverless Stack Toolkit (SST)"
---

### Can I use any CDK construct in SST?

Yes. The only caveats are:

- [`sst.App`](constructs/app.md) is included by default.
- [`sst.Stack`](constructs/stack.md) is necessary for SST to be able to [deploy to multiple stages](deploying-your-app.md#deploying-to-a-stage).
- [`sst.Function`](constructs/function.md) is necessary for the [Live Lambda Development](live-lambda-development.md) environment.

### Do I have to use the SST higher-level constructs?

No you don't have to use them. But they can be really handy when building out your serverless app. For example, the [`sst.Api`](constructs/api.md) construct gives you a really nice interface for defining your routes and giving them permissions.

```js
const api = new Api(this, "Api", {
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});

api.attachPermissions(["s3", "dynamodb"]);
```

### What's the connection to Serverless Framework?

Originally when SST was released, it was meant to be a way to [use CDK alongside your Serverless Framework apps](https://serverless-stack.com/chapters/using-aws-cdk-with-serverless-framework.html). While you can still do that. SST's [Live Lambda Development](live-lambda-development.md) environment now makes it a first-class development environment for serverless apps. So it's meant to be used as a standalone tool for building serverless apps.
