<p align="center">
  <a href="https://serverless-stack.com/">
    <img alt="Serverless Stack (SST)" src="https://raw.githubusercontent.com/serverless-stack/identity/main/sst.svg" width="300" />
  </a>
</p>

<p align="center">
  <a href="https://launchpass.com/serverless-stack"><img alt="Slack" src="https://img.shields.io/badge/Slack-chat-blue?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/@serverless-stack/cli"><img alt="npm" src="https://img.shields.io/npm/v/@serverless-stack/cli.svg?style=flat-square" /></a>
  <a href="https://github.com/serverless-stack/serverless-stack/actions/workflows/ci.yml"><img alt="Build status" src="https://img.shields.io/github/workflow/status/serverless-stack/serverless-stack/CI?style=flat-square" /></a>
</p>

---

Serverless Stack (SST) is a framework that makes it easy to build serverless apps. It's an extension of [AWS CDK](https://aws.amazon.com/cdk/) and it features:

- A [Live Lambda Development][live] environment
- Support for setting [breakpoints and debugging in VS Code](https://docs.serverless-stack.com/debugging-with-vscode)
- [Higher-level constructs][resources] designed specifically for serverless apps
- Zero-config support for Go, Python, ES and TypeScript using [esbuild](https://esbuild.github.io)
- Support for [deploying to multiple environments and regions](https://docs.serverless-stack.com/deploying-your-app#deploying-to-a-stage)

## Quick Start

Create your first SST app.

```bash
# Create your app
$ npx create-serverless-stack@latest my-sst-app
$ cd my-sst-app

# Start Live Lambda Development
$ npx sst start

# Deploy to prod
$ npx sst deploy --stage prod
```

## Documentation

- [SST docs](https://docs.serverless-stack.com)
- [SST examples](https://serverless-stack.com/examples/index.html)
- [Public roadmap][roadmap]
- [Feature requests][requests]
- [Contributing to SST](CONTRIBUTING.md)

[Follow us on Twitter](https://twitter.com/ServerlessStack) and [subscribe to our newsletter](https://serverless-stack.com/newsletter.html) for updates.

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

### Composable serverless constructs

SST also comes with [a set of serverless specific higher-level CDK constructs][resources]. This includes:

- [Api](https://docs.serverless-stack.com/constructs/Api) for building APIs
- [Cron](https://docs.serverless-stack.com/constructs/Cron) for building cron jobs
- [Queue](https://docs.serverless-stack.com/constructs/Queue) for creating queues
- [Bucket](https://docs.serverless-stack.com/constructs/Bucket) for adding S3 buckets
- [Auth](https://docs.serverless-stack.com/constructs/Auth) for configuring authentication
- [Table](https://docs.serverless-stack.com/constructs/Table) for adding DynamoDB tables
- [Topic](https://docs.serverless-stack.com/constructs/Topic) for creating pub/sub systems
- [StaticSite](https://docs.serverless-stack.com/constructs/StaticSite) for creating static websites
- [EventBus](https://docs.serverless-stack.com/constructs/EventBus) for creating EventBridge Event buses
- [KinesisStream](https://docs.serverless-stack.com/constructs/KinesisStream) for real-time data streaming
- [WebSocketApi](https://docs.serverless-stack.com/constructs/WebSocketApi) for creating WebSocket APIs
- [ApolloApi](https://docs.serverless-stack.com/constructs/ApolloApi) for using Apollo Server with Lambda
- [AppSyncApi](https://docs.serverless-stack.com/constructs/AppSyncApi) for creating AppSync GraphQL APIs
- [ApiGatewayV1Api](https://docs.serverless-stack.com/constructs/ApiGatewayV1Api) for using AWS API Gateway v1
- [ReactStaticSite](https://docs.serverless-stack.com/constructs/ReactStaticSite) for creating React static websites

### And more

SST also supports deploying your CloudFormation stacks asynchronously. [Seed](https://seed.run) natively supports concurrent asynchronous deployments for your SST apps. And SST deployments on Seed are free!

SST also comes with a few other niceties:

- Automatically lints your code using [ESLint](https://eslint.org/)
- Runs your unit tests using [Jest](https://jestjs.io/)

Internally, SST uses the CDK CLI to invoke the various CDK commands.

[slack]: https://launchpass.com/serverless-stack
[resources]: https://docs.serverless-stack.com/packages/resources
[live]: https://docs.serverless-stack.com/live-lambda-development
[roadmap]: https://github.com/serverless-stack/serverless-stack/projects/1
[requests]: https://github.com/serverless-stack/serverless-stack/discussions/categories/ideas?discussions_q=category%3AIdeas+sort%3Atop+is%3Aunanswered
