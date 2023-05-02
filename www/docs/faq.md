---
title: Frequently Asked Questions
description: "Frequently asked questions about SST."
---

import config from "../config";
import styles from "./video.module.css";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Some common questions we get about SST.

</HeadlineText>

If there's something that we are not addressing here, feel free to hop on to our <a href={ config.discord }>Discord</a> and let us know.

---

## Who is SST designed for?

SST is designed for growing companies that want to be able to easily build and iterate on their products. Companies that need to be able to launch new features quickly, iterate, and make changes to a growing codebase.

Here's how SST helps:

1. SST's constructs make it easy to add any backend feature with a few lines of code.
2. It also allows you to customize them as your app grows more complex.
3. Our starters are built around the patterns of [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design); keeping your codebase flexible and maintainable.

You can [read more our design principles](design-principles.md).

---

## How does SST compare to?

You might be curious about how it compares to other projects and services. Here we'll look at a couple of other ways of building apps on AWS.

Feel free to let us know on <a href={ config.discord }>Discord</a> if you want us to add to this list.

---

### Serverless Framework

[Serverless Framework](https://github.com/serverless/serverless) is an open source framework that makes it easier to work with Lambda functions on AWS. They've been around for a while. But they are not a good choice for building modern full-stack applications. Here are a couple of reasons why:

1. It is not designed to work with your frontend.
   1. They have poor support for modern frontends. Their Next.js plugin, [serverless-nextjs](https://github.com/serverless-nextjs/serverless-next.js) is not maintained anymore. There is nothing official for the other frameworks.
   2. There are no easy ways to connect your frontend and your backend.
2. It uses a simple config to create Lambda functions through their `serverless.yml` config. But for most other backend features, you need to use [AWS CloudFormation](https://aws.amazon.com/cloudformation/). CloudFormation is really verbose and requires a lot of AWS knowledge.
3. The local development experience is really poor. You have to either mock AWS services locally or run a command and wait every time you make a change.

---

### Amplify

[AWS Amplify](https://aws.amazon.com/amplify/) is a collection of services, CLIs, client libraries, and UI kits with the broad goal of making it easy to build full-stack web and mobile applications. It was originally created in response to [Firebase](https://firebase.google.com).

One of their main services is [Amplify Hosting](https://aws.amazon.com/amplify/hosting/); a clone of [Vercel](https://vercel.com) and [Netlify](https://www.netlify.com). You can host [Next.js](https://nextjs.org) and other modern frontends by connecting your Git repo to it. While Amplify Hosting is connected to your AWS account, it's deployed as a separate service within your AWS account. This means that it does not **expose the underlying infrastructure** it uses.

For Next.js, Amplify has their own internal way of deploying Next.js using CloudFront, Lambda, S3, etc. For comparison, Vercel uses Lambda internally for Next.js as well, but it also uses CloudFlare and wires everything together in a proprietary and undocumented way. This means that you cannot get complete feature parity for Next.js on AWS. And you are going to run into **bugs and edge cases**.

This is made worse by the fact that Amplify is a **closed source service**. Here are some of the types of problems people run into:

- The docs claim that they support a certain feature but users end up finding out that it doesn't ([#3320](https://github.com/aws-amplify/amplify-hosting/issues/3320#issuecomment-1460965192), [#3114](https://github.com/aws-amplify/amplify-hosting/issues/3114#issuecomment-1418508346)).
- Performance issues being impossible to debug because the underlying infrastructure is not exposed ([#3359](https://github.com/aws-amplify/amplify-hosting/issues/3359), [#3357](https://github.com/aws-amplify/amplify-hosting/issues/3357)).
- You cannot customize the infrastructure that Amplify creates ([tweet](https://twitter.com/dreamorosi/status/1650805208966938624)).
- Finally, you can't just submit a PR for a bug fix or a new feature. You'll need to wait for the Amplify team to add support for it.

SST on the other hand uses [OpenNext](https://open-next.js.org), a community-driven open source effort to reverse engineer how Vercel deploys Next.js internally. It also deploys all the infrastructure to your AWS account and allows you to customize it.

---

### SAM

AWS created [AWS SAM](https://github.com/aws/aws-sam-cli) in response to [Serverless Framework](https://github.com/serverless/serverless).

It extends [AWS CloudFormation](https://aws.amazon.com/cloudformation/) and is more native to AWS. But in general has worse developer experience. It also has a smaller open source community around it. It's not a good choice for building modern full-stack applications because:

- It is not designed to work with your frontend.
  - There are no built-in ways to deploy Next.js, Svelte, Remix, Astro, or other SSR frontends.
  - There are no easy ways to connect your frontend and your backend.
- You need to use AWS CloudFormation to define the infrastructure for your backend. It is verbose and needs a lot of AWS knowledge.
- The local development experience for SAM is really poor. It takes a few seconds to redeploy every time you make a change and you can't set breakpoints.

---

### CDK

If you happen to be familiar with [AWS CDK](https://sst.dev/chapters/what-is-aws-cdk.html), you might be wondering why not just use CDK directly, given that SST uses CDK behind the scenes?

There are a couple of reasons but it all revolves around the fact that:

- CDK is a framework for **defining the infrastructure** of your application.
- While SST is a framework for **building full-stack applications**, similar to Rails or Django.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/pKF76iW1_Og" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

#### SST, an application framework

What this means in practise is that SST gives you the following:

1. Types, secrets, and environment variables are shared across your application.
2. Built-in support for writing database migrations, unit tests, and integration tests for your application code.
3. Support for deploying to separate environments, allowing for a PR workflow.
4. Higher-level constructs for common backend features like APIs, databases, cron jobs, etc.
5. Typesafe libraries for your Lambda functions.

#### First-class local development environment

SST features the [Live Lambda Dev](live-lambda-development.md) environment that gives you a **first-class local development** environment for building your applications.

CDK does have the [CDK Watch](live-lambda-development.md#cdk-watch) command but it's too slow. It takes a few seconds to redeploy your functions when you make a change. And you can't set breakpoints.

#### TypeScript-first design

CDK is designed to support multiple programming languages. While, SST is designed from the ground up for TypeScript. This means that SST code is more readable, less verbose, and far more pleasant to work with.

---

## Can I use all the CDK constructs in SST?

Yes. The only caveats are:

- [`sst.App`](constructs/App.md) is included by default and is used in place of `cdk.App`.
- [`sst.Stack`](constructs/Stack.md) is necessary for SST to be able to deploy to multiple stages and is used in place of `cdk.Stack`.
- [`sst.Function`](constructs/Function.md) is necessary for the [Live Lambda Development](live-lambda-development.md) environment. But if you don't need that you can use the CDK function constructs.

---

## How often is SST's version of CDK updated?

SST internally includes CDK, so you don't have to. We update this version fairly frequently. But if you need the latest version right away, open an issue and we'll push out an update.

---

## Why doesn't SST use CDK's built-in way to build Node.js functions?

CDK has a construct for building Lambda functions, [aws-cdk-lib/aws-lambda-nodejs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html). But SST does not use it, here's why:

SST's [Live Lambda Development environment](live-lambda-development.md) allows you to test your Lambda functions live. To do this, it watches your file changes and transpiles your functions. While they are being transpiled, it blocks any requests that are made to them. To ensure a great experience, it needs to do this process as fast as possible. So we decided to use esbuild, since [it's the fastest option](https://esbuild.github.io/faq/#why-is-esbuild-fast). We also maintain an esbuild service internally and call it programmatically to make rebuilds as fast as possible.

It also makes sense to build the Lambda functions in a similar way while running `sst deploy`.

---

## How does SST make money?

While SST is open source and free to use, we also run a service that helps you deploy your serverless applications, called [Seed](https://seed.run). It is a SaaS service and many of the teams using SST use Seed as well.
