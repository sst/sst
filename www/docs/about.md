---
id: about
title: Serverless Stack Toolkit
sidebar_label: About
slug: /
---

import config from "../config";

Serverless Stack Toolkit (SST) is an extension of [AWS CDK](https://aws.amazon.com/cdk/) that:

- Includes a complete [local development environment for Lambda](#local-lambda-development)
  - Supports remotely invoking local functions
  - Zero-config ES and TypeScript support using [esbuild](https://esbuild.github.io)
- Allows you to use [CDK with Serverless Framework](https://serverless-stack.com/chapters/using-aws-cdk-with-serverless-framework.html)

<p>
<img src="https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-1356x790.gif" width="600" alt="sst start" />
</p>

## Quick start

Create your first SST app.

```bash
npx create-serverless-stack@latest my-sst-app
cd my-sst-app
npx sst start
```

## Example project

We use SST as a part of the [Serverless Stack guide](https://serverless-stack.com). We build a [simple notes app](http://demo2.serverless-stack.com/) in the guide and the backend for it is created using Serverless Framework and CDK with SST. You can check out the repo here — [serverless-stack-demo-api](https://github.com/AnomalyInnovations/serverless-stack-demo-api).

## Future roadmap

SST is being actively developed. Check out the <a href={ config.roadmap }>the public SST roadmap here</a>. And make sure to **star the repo** and subscribe to updates.


## Getting help

- <a href={ config.slack }>Slack</a>
- <a href={ config.github }>GitHub</a>
- <a href={ config.forums }>Forums</a>
