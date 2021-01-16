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

## Table of Contents

- [Background](#background)
- [Usage](#usage)
  - [Creating an app](#creating-an-app)
  - [Working on your app](#working-on-your-app)
  - [Developing locally](#developing-locally)
  - [Building your app](#building-your-app)
  - [Testing your app](#testing-your-app)
  - [Deploying your app](#deploying-your-app)
  - [Removing an app](#removing-an-app)
  - [Package scripts](#package-scripts)
  - [Linting, type checking](#linting-type-checking)
- [Example Project](#example-project)
- [Migrating From CDK](#migrating-from-cdk)
- [Known Issues](#known-issues)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [Running Locally](#running-locally)
- [References](#references)
  - [`@serverless-stack/cli`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/cli)
  - [`create-serverless-stack`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/create-serverless-stack)
  - [`@serverless-stack/resources`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/resources)
- [Community](#community)

---

## Background

## Usage

## Migrating From CDK

## Known Issues

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

## References

- [`@serverless-stack/cli`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/cli)
- [`create-serverless-stack`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/create-serverless-stack)
- [`@serverless-stack/resources`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/resources)

## Community

[Follow us on Twitter](https://twitter.com/ServerlessStack), [join us on Slack][slack], [post on our forums](https://discourse.serverless-stack.com), and [subscribe to our newsletter](https://emailoctopus.com/lists/1c11b9a8-1500-11e8-a3c9-06b79b628af2/forms/subscribe).

## Thanks

This project extends [AWS CDK](https://github.com/aws/aws-cdk) and is based on the ideas from [Create React App](https://www.github.com/facebook/create-react-app).

---

Brought to you by [Anomaly Innovations](https://anoma.ly/); makers of [Seed](https://seed.run/) and the [Serverless Stack Guide](https://serverless-stack.com/).

[slack]: https://join.slack.com/t/serverless-stack/shared_invite/zt-kqna615x-AFoTXvrglivZqJZcnTzKZA
[roadmap]: https://github.com/serverless-stack/serverless-stack/milestones?direction=asc&sort=due_date&state=open
