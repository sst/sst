<p align="center">
  <a href="https://docs.serverless-stack.com/">
    <img alt="Serverless Stack Toolkit (SST)" src="https://raw.githubusercontent.com/serverless-stack/identity/main/sst.svg" width="200" />
  </a>
</p>

<p align="center">
  <b>Serverless Stack Toolkit (SST)</b>
</p>

<p align="center">
  <a href="https://join.slack.com/t/serverless-stack/shared_invite/zt-kqna615x-AFoTXvrglivZqJZcnTzKZA"><img alt="Slack" src="https://img.shields.io/badge/Slack-chat-blue.svg" /></a>
  <a href="https://www.npmjs.com/package/@serverless-stack/cli"><img alt="npm" src="https://img.shields.io/npm/v/@serverless-stack/cli.svg" /></a>
  <a href="https://github.com/serverless-stack/serverless-stack/actions"><img alt="Build status" src="https://github.com/serverless-stack/serverless-stack/workflows/CI/badge.svg" /></a>
</p>

---

Serverless Stack Toolkit (SST) is an extension of [AWS CDK](https://aws.amazon.com/cdk/) that:

- Includes a [Live Lambda Development environment](#live-lambda-development)
- With zero-config support for ES and TypeScript using [esbuild](https://esbuild.github.io)
- Allows you to use [CDK with Serverless Framework](https://serverless-stack.com/chapters/using-aws-cdk-with-serverless-framework.html)

[![sst start](https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-2.gif)](https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-2.mp4)

SST also supports deploying your CloudFormation stacks asynchronously. [Seed](https://seed.run) natively supports concurrent asynchronous deployments for your SST apps. And SST deployments on Seed are free!

SST also comes with a few other niceties:

- Automatically lints your code using [ESLint](https://eslint.org/)
- Runs your unit tests using [Jest](https://jestjs.io/)

Behind the scenes, SST uses [a lightweight fork of AWS CDK](https://github.com/serverless-stack/aws-cdk) to programmatically invoke the various CDK commands.

## Quick Start

Create your first SST app.

```bash
$ npx create-serverless-stack@latest my-sst-app
$ cd my-sst-app
$ npx sst start
```


## Live Lambda Development

The `sst start` command starts up a local development environment that opens a WebSocket connection to your deployed app and proxies any Lambda requests to your local machine. This allows you to:

- Work on your Lambda functions locally
- Supports all Lambda triggers, so there's no need to mock API Gateway, SQS, SNS, etc.
- Supports real Lambda environment variables and Lambda IAM permissions
- And it's fast. There's nothing to deploy when you make a change!

[Read more about Live Lambda Development](https://docs.serverless-stack.com/live-lambda-development).

## Documentation

[**View the SST docs**](https://docs.serverless-stack.com).

## Future Roadmap

SST is being actively developed. Check out the [public SST roadmap here](https://github.com/serverless-stack/serverless-stack/milestones?direction=asc&sort=due_date&state=open). And make sure to **star the repo** and subscribe to updates.

## Contributing

Check out our [roadmap][roadmap] and [join our Slack][slack] to get started.

- Open [a new issue](https://github.com/serverless-stack/serverless-stack/issues/new) if you've found a bug or have some suggestions.
- Or submit a pull request!

## Running Locally

To run this project locally, clone the repo and initialize the project.

```bash
$ git clone https://github.com/serverless-stack/serverless-stack.git
$ cd serverless-stack
$ yarn
```

Run all the tests.

```bash
$ yarn test
```

To run the docs site.

```bash
$ cd www
$ yarn start
```

## Community

[Follow us on Twitter](https://twitter.com/ServerlessStack), [join us on Slack][slack], [post on our forums](https://discourse.serverless-stack.com), and [subscribe to our newsletter](https://emailoctopus.com/lists/1c11b9a8-1500-11e8-a3c9-06b79b628af2/forms/subscribe).

## Thanks

This project extends [AWS CDK](https://github.com/aws/aws-cdk) and is based on the ideas from [Create React App](https://www.github.com/facebook/create-react-app).

---

Brought to you by [Anomaly Innovations](https://anoma.ly/); makers of [Seed](https://seed.run/) and the [Serverless Stack Guide](https://serverless-stack.com/).

[slack]: https://join.slack.com/t/serverless-stack/shared_invite/zt-kqna615x-AFoTXvrglivZqJZcnTzKZA
[roadmap]: https://github.com/serverless-stack/serverless-stack/milestones?direction=asc&sort=due_date&state=open
