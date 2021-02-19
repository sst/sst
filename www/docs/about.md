---
id: about
title: Serverless Stack Toolkit
hide_title: true
description: Serverless Stack Toolkit (SST) Docs
slug: /
---

import config from "../config";

<p style={{ margin: 0 }}>
  <a href="https://www.npmjs.com/package/@serverless-stack/cli"><img alt="npm" src="https://img.shields.io/npm/v/@serverless-stack/cli.svg?style=flat-square" /></a>
</p>

<h1 style={{ marginTop: 0 }}>Serverless Stack Toolkit</h1>

Serverless Stack Toolkit (SST) is an extension of [AWS CDK](https://aws.amazon.com/cdk/) that makes it easy to build serverless apps. It features:

- A [Live Lambda Development](live-lambda-development.md) environment
- Zero-config support for ES and TypeScript using [esbuild](https://esbuild.github.io)
- Support for [deploying to multiple environments and regions](deploying-your-app.md#deploying-to-a-stage)
- [Higher-level constructs](packages/resources.md) designed specifically for serverless apps

<video width="99%" playsinline controls muted>
  <source src="https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-2.mp4" type="video/mp4" playsinline="" />
</video>

---

SST also supports deploying your CloudFormation stacks asynchronously. [Seed](https://seed.run) natively supports concurrent asynchronous deployments for your SST apps. And SST deployments on Seed are free!

SST also comes with a few other niceties:

- Automatically lints your code using [ESLint](https://eslint.org/)
- Runs your unit tests using [Jest](https://jestjs.io/)

Internally, SST uses the CDK CLI to invoke the various CDK commands.

## Quick start

Create your first SST app.

```bash
# Create your app
npx create-serverless-stack@latest my-sst-app
cd my-sst-app

# Start Live Lambda Development
npx sst start

# Deploy to prod
npx sst deploy --stage prod
```

## Examples

We have [a growing collection of examples](https://serverless-stack.com/examples) of serverless apps built with SST.

## Future roadmap

SST is being actively developed. Check out the <a href={ config.roadmap }>the public SST roadmap here</a>. And make sure to **star the repo** and subscribe to updates.

## Getting help

We always want to hear from you! We'd like to learn about your experience with SST. Please get in touch if you have any questions or have some feedback for us.

- <a href={ config.slack }>Slack</a>
- <a href={ `mailto:${config.email}` }>Email</a>
- <a href={ config.github }>GitHub</a>
- <a href={ config.forums }>Forums</a>
