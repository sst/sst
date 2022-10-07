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

## Why not just use CDK directly?

If you happen to be familiar with [AWS CDK](https://sst.dev/chapters/what-is-aws-cdk.html), you might be wondering why not just use CDK directly? There are a couple of reasons but it all revolves around the fact that:

- CDK is a framework for **defining the infrastructure** of your application.
- While SST is a **full-stack application framework**, similar to Rails or Django, that happens to use CDK to define your infrastructure.

#### SST, an application framework

What this means in practise is that SST gives you the following:

1. Types, secrets, and environment variables are [shared across your application](what-is-sst.md#connect-to-the-api).
2. Built-in support for writing [database migrations](what-is-sst.md#databases), [unit tests, and integration tests](advanced/testing.md) for your application code.
3. Support for [deploying to separate environments](what-is-sst.md#environments), allowing for a PR workflow.
4. Higher-level constructs for common use cases like [APIs](constructs/Api.md), [databases](constructs/RDS.md), [cron jobs](constructs/Cron.md), etc.
5. [Type-safe libraries](packages/node.md) for your Lambda functions.

#### First-class local development environment

SST features the [Live Lambda Dev](live-lambda-development.md) environment that gives you a **first-class local development** environment for building your applications.

CDK does have something called [CDK Watch](live-lambda-development.md#cdk-watch) but it's too slow. It takes a few seconds to redeploy your functions when you make a change. And you can't set breakpoints locally.

#### TypeScript-first design

CDK is designed to support multiple programming languages. While, SST is designed from the group up for TypeScript. This means that SST code is more readable, less verbose, and far more pleasant to work with. [Read more about the design of SST's constructs](constructs/v0/migration.md#goals).

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
