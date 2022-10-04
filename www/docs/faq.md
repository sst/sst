---
title: Frequently Asked Questions
description: "Frequently asked questions about SST."
---

import config from "../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Some common questions we get about SST.

</HeadlineText>

If there's something that we are not addressing here, feel free to hop on to our <a href={ config.discord }>Discord</a> and let us know.

---

## Would SST work for my use case?

A key aspect of SST is that you are not locked into using our constructs. You can always drop down to CDK and deploy any AWS service with it.

That said, if you hit a limitation, feel free to hop on our <a href={ config.discord }>Discord</a> and tell us about it.

---

## Do we need another framework for serverless?

While [Serverless Framework](https://github.com/serverless/serverless) and [SAM](https://github.com/aws/serverless-application-model) have been around for a while, the local development experience for them isn't great. And they require you to define your resources using the really verbose [CloudFormation YAML](https://sst.dev/chapters/what-is-infrastructure-as-code.html#aws-cloudformation) (or JSON).

In comparison, SST features:

- A [Live Lambda Development](live-lambda-development.md) environment, that introduces a completely new local development experience for serverless.
- And it uses [AWS CDK](https://sst.dev/chapters/what-is-aws-cdk.html), allowing you to define your resources using regular programming languages.

We think this makes SST the best way to build serverless applications.

---

## Can I use all the CDK constructs in SST?

Yes. The only caveats are:

- [`sst.App`](constructs/App.md) is included by default and is used in place of `cdk.App`.
- [`sst.Stack`](constructs/Stack.md) is necessary for SST to be able to [deploy to multiple stages](quick-start.md#deploying-an-app) and is used in place of `cdk.Stack`.
- [`sst.Function`](constructs/Function.md) is necessary for the [Live Lambda Development](live-lambda-development.md) environment. But if you don't need that you can use the CDK function constructs.

---

## I like CDK, do I have to use the SST's constructs?

No, you don't have to use them.

But they can be really handy when building out your serverless app. For example, the [`sst.Api`](constructs/Api.md) construct gives you a really nice interface for defining your routes and giving them permissions.

```js
const api = new Api(this, "Api", {
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});

api.attachPermissions(["s3", "dynamodb"]);
```

In addition to the nicer design, constructs like the [`Job`](long-running-jobs.md) construct come with [typesafe Lambda helpers](packages/node.md#job).

---

## How often is SST's version of CDK updated?

SST internally includes CDK, so you don't have to. We update this version fairly frequently. But if you need the latest version right away, open an issue and we'll push out an update.

---

## Why doesn't SST use CDK's built-in way to build Node.js functions?

CDK has a construct for building Lambda functions, [aws-cdk-lib/aws-lambda-nodejs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html). But SST does not use it, here's why:

SST's [Live Lambda Development environment](live-lambda-development.md) allows you to test your Lambda functions live. To do this, it watches your file changes and transpiles your functions. While they are being transpiled, it blocks any requests that are made to them. To ensure a great experience, it needs to do this process as fast as possible. So we decided to use esbuild, since [it's the fastest option](https://esbuild.github.io/faq/#why-is-esbuild-fast). We also maintain an esbuild service internally and call it programmatically to make rebuilds as fast as possible.

It also makes sense to build the Lambda functions in a similar way while running `sst deploy`.

In addition, we also decided to use esbuild to transpile your CDK code, so you can use the same flavor of JS as your Lambda functions.

---

## How does SST make money?

While SST is open source and free to use, we also run a service that helps you deploy your serverless applications, called [Seed](https://seed.run). It is a SaaS service and many of the teams using SST use Seed as well.
