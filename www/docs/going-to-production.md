---
title: Going to Production
description: "Learn how to take your Serverless Stack (SST) app to production."
---

Once you are ready to deploy your SST app to production and go live with real users, you should double check a couple of things.

- Make sure the [default removal policy](./constructs/App.md#setting-a-default-removal-policy) is **NOT set to `DESTROY`** for production environments.
- Make sure the **secrets are not stored in the code** and committed to Git. Store the secrets with the [CI provider](environment-variables.md#environment-variables-in-seed) or use [AWS SSM](environment-variables.md#working-with-secrets).
- Review the log retention setting for Lambda function logs and API access logs. Ensure that the number of days the logs are kept in [CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html) fits your budget.
- If you'd like extra visibility on your Lambda functions, consider using a [monitoring service](./advanced/monitoring.md) for your functions.
- It's recommended that you and your team **do NOT have permission** to deploy to production environments **from your local machines**. Deployments to production environments should be done from a consistent and secure environment like a CI server.

## Deployment options

It's a good idea to create a CI/CD pipeline to deploy your SST apps to production. Here are a couple of ways to do so. 

### Seed (Recommended)

The easiest way to deploy SST to production is to use [Seed](https://seed.run). Seed is a fully-managed CI/CD pipeline for serverless apps on AWS. It was built by the creators of SST.

There are a couple of other reasons why Seed is a good fit for SST apps.

1. Speed

   It's the fastest way to deploy CDK apps. Seed automatically caches dependencies to speed up your builds.

2. Free

   Seed also directly plugs into the SST deployment process. So when an SST app is waiting for CloudFormation to update your stacks, Seed pauses the build process and does this asynchronously. This allows Seed to make SST deployments very efficient and offer it to you for free!

#### Getting started

If you haven’t already done so, push your SST app to a Git provider of your choice: [GitHub](https://github.com/), [GitLab](https://about.gitlab.com/), or [BitBucket](https://bitbucket.org/). Your repository can be private or public.

Then, follow these steps in the Seed docs to [Add your SST app](https://seed.run/docs/adding-a-cdk-app#advantages-of-cdk-and-sst-on-seed).

#### Pull Request workflow

By enabling the [Pull Request workflow](https://seed.run/docs/working-with-pull-requests), when a PR is opened, Seed will build, test, and deploy the pull request commits automatically into a new stage. The new pull request stage will be an independent clone of your production environment.

Using the PR workflow allows you to share deployment previews with your team. This, in addition to doing code reviews allows you to have a consistent process around how code gets pushed to production.

### Other providers

In addition to Seed, there are other general purpose CI providers that you can use to deploy your SST apps:

1. [Github Actions](https://github.com/features/actions)
2. [Travis CI](https://www.travis-ci.com)
3. [CircleCI](https://circleci.com)

Here's what you'll need to add to your CI build scripts. Assuming your production stage is called `prod`.

```bash
$ npm install
$ npx sst deploy --stage prod

# With Yarn

$ yarn
$ yarn sst deploy --stage prod
```
