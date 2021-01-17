---
id: background
title: Background
---

import config from "../config";

## Local Lambda development

Developing Lambdas locally is painful, you either:

1. Locally mock all the AWS services you are using
2. Or, constantly deploy your changes to test them

Both these approaches don't work well in practice. Locally mocking all the AWS services can be hard to do and most setups are really flaky. While, constantly deploying your Lambda functions or infrastructure can be simply too slow.

The `sst start` command starts up a local development environment that opens a WebSocket connection to your deployed app and proxies any Lambda requests to your local machine. This allows you to:

- Work on your Lambda functions locally
- While, interacting with your entire deployed AWS infrastructure
- Supports all Lambda triggers, so there's no need to mock API Gateway, SQS, SNS, etc.
- Supports real Lambda environment variables and Lambda IAM permissions
- So if a Lambda fails on AWS due to lack of IAM permissions, it would fail locally as well
- And it's fast. There's nothing to deploy when you make a change!

You can read more about the [**sst start** command here](packages/cli.md#start) and [try out a demo here](https://github.com/serverless-stack/sst-start-demo).

## Using Serverless Framework with CDK

[Serverless Framework](https://github.com/serverless/serverless) is great but deploying any other AWS resources requires you to write CloudFormation templates in YAML. CloudFormation templates are incredibly verbose and even creating simple resources can take hundreds of lines of YAML. AWS CDK solves this by allowing you to generate CloudFormation templates using modern programming languages. Making it truly, _infrastructure as code_.

However, to use AWS CDK alongside your Serverless Framework services, requires you to follow certain conventions.

- **Deploying all the stacks to the same region and AWS account**

  Serverless Framework apps are deployed to multiple environments using the `--region` and `AWS_PROFILE=profile` options. CDK apps on the other hand, contain CloudFormation stacks that are deployed to multiple regions and AWS accounts simultaneously.

- **Prefixing stage and resource names**

  Since the same app is deployed to multiple environments, Serverless Framework adopts the practice of prefixing the stack names with the stage name. On the other hand, to deploy a CDK app to multiple stages, you'd need to manually ensure that the stack names and resource names don't thrash.

SST provides the above out-of-the-box. So you can deploy your Serverless services using:

```bash
AWS_PROFILE=production serverless deploy --stage prod --region us-east-1
```

And use CDK for the rest of your AWS infrastructure:

```bash
AWS_PROFILE=production npx sst deploy --stage prod --region us-east-1
```

You can [read more about this here](https://serverless-stack.com/chapters/using-aws-cdk-with-serverless-framework.html).

## And more

As a bonus, SST also supports deploying your CloudFormation stacks asynchronously. So you don't have to waste CI build minutes waiting for CloudFormation to complete. [Seed](https://seed.run) natively supports concurrent asynchronous deployments for your SST apps. Making it 5x faster than other CI services. And SST deployments on Seed are free!

SST also comes with a few other niceties:

- Zero-config support for ES and TypeScript using [esbuild](http://esbuild.github.io)
- Automatically lints your code using [ESLint](https://eslint.org/)
- Runs your unit tests using [Jest](https://jestjs.io/)

Behind the scenes, SST uses <a href={ config.forkedCdk }>a lightweight fork of AWS CDK</a> to programmatically invoke the various CDK commands.
