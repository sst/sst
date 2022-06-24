<p align="center">
  <a href="https://sst.dev/">
    <img alt="Serverless Stack (SST)" src="https://raw.githubusercontent.com/serverless-stack/identity/main/sst.svg" width="300" />
  </a>
</p>

<p align="center">
  <a href="https://sst.dev/discord"><img alt="Discord" src="https://img.shields.io/discord/983865673656705025?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/@serverless-stack/resources"><img alt="npm" src="https://img.shields.io/npm/v/@serverless-stack/resources.svg?style=flat-square" /></a>
  <a href="https://github.com/serverless-stack/serverless-stack/actions/workflows/ci.yml"><img alt="Build status" src="https://img.shields.io/github/workflow/status/serverless-stack/serverless-stack/CI?style=flat-square" /></a>
</p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=wBTDkLIyMhw">
    <img alt="Launch: create sst" src="packages/create-sst/social-share.png?raw=true&sanitize=true" width="600" />
  </a>
</p>

---

Serverless Stack (SST) is a framework that makes it easy to build serverless apps. It's an extension of [AWS CDK](https://aws.amazon.com/cdk/) and it features:

- A [Live Lambda Development][live] environment
- A [web based dashboard][console_doc] to manage your apps
- Support for [setting breakpoints and debugging in VS Code](https://docs.sst.dev/live-lambda-development#debugging-with-visual-studio-code)
- [Higher-level constructs][resources] designed specifically for serverless apps
- Zero-config support for JS and TS (using [esbuild](https://esbuild.github.io)), Go, Python, C#, and F#

## Quick Start

Create your first SST app.

```bash
# Create a new SST app
npm init sst
cd my-sst-app

# Start Live Lambda Dev
npm start

# Open the SST Console
open console.sst.dev

# Deploy to prod
npx sst deploy --stage prod
```

## Documentation

- [SST docs](https://docs.sst.dev)
- [SST examples](https://sst.dev/examples/index.html)
- [Public roadmap][roadmap]
- [Feature requests][requests]
- [Contributing to SST](CONTRIBUTING.md)

[Follow us on Twitter](https://twitter.com/ServerlessStack) and [subscribe to our newsletter](https://sst.dev/newsletter.html) for updates.

## About SST

We think SST can make it dramatically easier to build serverless apps.

### Live Lambda Development

The `sst start` command starts up a local development environment that opens a WebSocket connection to your deployed app and proxies any Lambda requests to your local machine.

[![sst start](https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-2.gif)](https://www.youtube.com/watch?v=hnTSTm5n11g&feature=youtu.be)

This allows you to:

- Work on your Lambda functions locally
- Supports all Lambda triggers, so there's no need to mock API Gateway, SQS, SNS, etc.
- Supports real Lambda environment variables and Lambda IAM permissions
- And it's fast. There's nothing to deploy when you make a change!

[Read more about Live Lambda Development][live].

### SST Console

The [SST Console][console_doc] is a web based dashboard to manage your SST apps.

[![sst start](www/static/img/console/sst-console-homescreen.png)][console_doc]

It allows you to:

- Invoke functions and replay them
- Make HTTP requests and test your APIs
- Scan, query, and edit items in DynamoDB
- Query the GraphQL endpoints in your app
- Upload and delete files from your buckets
- Create and delete users in your User Pools
- Query your RDS databases and run migrations

[Read more about the SST Console][console_doc].

### Composable serverless constructs

SST also comes with [a set of serverless specific higher-level CDK constructs][resources]. This includes:

- [Api](https://docs.sst.dev/constructs/Api) for building APIs
- [Cron](https://docs.sst.dev/constructs/Cron) for building cron jobs
- [Queue](https://docs.sst.dev/constructs/Queue) for creating queues
- [Bucket](https://docs.sst.dev/constructs/Bucket) for adding S3 buckets
- [Auth](https://docs.sst.dev/constructs/Auth) for configuring authentication
- [Table](https://docs.sst.dev/constructs/Table) for adding DynamoDB tables
- [Topic](https://docs.sst.dev/constructs/Topic) for creating pub/sub systems
- [StaticSite](https://docs.sst.dev/constructs/StaticSite) for creating static websites
- [NextjsSite](https://docs.sst.dev/constructs/NextjsSite) for creating Next.js websites
- [Script](https://docs.sst.dev/constructs/Script) for running scripts while deploying
- [ViteStaticSite](https://docs.sst.dev/constructs/ViteStaticSite) for static sites built with Vite
- [KinesisStream](https://docs.sst.dev/constructs/KinesisStream) for real-time data streaming
- [RDS](https://docs.sst.dev/constructs/RDS) for creating an RDS Serverless Cluster
- [WebSocketApi](https://docs.sst.dev/constructs/WebSocketApi) for creating WebSocket APIs
- [GraphQLApi](https://docs.sst.dev/constructs/GraphQLApi) for using GraphQL with Lambda
- [EventBus](https://docs.sst.dev/constructs/EventBus) for creating EventBridge Event buses
- [AppSyncApi](https://docs.sst.dev/constructs/AppSyncApi) for creating AppSync GraphQL APIs
- [ApiGatewayV1Api](https://docs.sst.dev/constructs/ApiGatewayV1Api) for using AWS API Gateway v1
- [ReactStaticSite](https://docs.sst.dev/constructs/ReactStaticSite) for static sites built with Create React App

### And more

SST also supports deploying your CloudFormation stacks asynchronously. [Seed](https://seed.run) natively supports concurrent asynchronous deployments for your SST apps. And SST deployments on Seed are free!

SST also comes with a few other niceties:

- Automatically lints your code using [ESLint](https://eslint.org/)
- Runs your unit tests using [Jest](https://jestjs.io/)

Internally, SST uses the CDK CLI to invoke the various CDK commands.

[discord]: https://sst.dev/discord
[console_doc]: https://docs.sst.dev/console
[resources]: https://docs.sst.dev/packages/resources
[live]: https://docs.sst.dev/live-lambda-development
[roadmap]: https://github.com/serverless-stack/serverless-stack/projects/2
[requests]: https://github.com/serverless-stack/serverless-stack/discussions/categories/ideas?discussions_q=category%3AIdeas+sort%3Atop+is%3Aunanswered
