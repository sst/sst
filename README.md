# Serverless Stack Toolkit (SST) [![Slack](https://img.shields.io/badge/Slack-chat-blue.svg)][slack] [![npm](https://img.shields.io/npm/v/@serverless-stack/cli.svg)](https://www.npmjs.com/package/@serverless-stack/cli) [![Build Status](https://github.com/serverless-stack/serverless-stack/workflows/CI/badge.svg)](https://github.com/serverless-stack/serverless-stack/actions)

<img alt="Logo" align="right" src="https://raw.githubusercontent.com/serverless-stack/identity/main/sst.svg" width="20%" />

Serverless Stack Toolkit (SST) is an extension of [AWS CDK](https://aws.amazon.com/cdk/) that:

- Includes a complete [local development environment for Lambda](#local-lambda-development)
  - Supports remotely invoking local functions
  - Zero-config ES and TypeScript support using [esbuild](https://esbuild.github.io)
- Allows you to use [CDK with Serverless Framework](https://serverless-stack.com/chapters/using-aws-cdk-with-serverless-framework.html)

Getting help: [**Slack**][slack] / [**Twitter**](https://twitter.com/ServerlessStack) / [**Forums**](https://discourse.serverless-stack.com/)

## Quick Start

Create your first SST app.

```bash
$ npx create-serverless-stack@latest my-sst-app
$ cd my-sst-app
$ npx sst start
```

<p>
<img src="https://d1ne2nltv07ycv.cloudfront.net/SST/sst-start-demo/sst-start-demo-1356x790.gif" width="600" alt="sst start" />
</p>

## Documentation

[**View the SST docs**](https://docs.serverless-stack.com)

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

``` bash
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
