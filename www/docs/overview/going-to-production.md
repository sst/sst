---
title: Going to Production 🟢
description: "Going to production with your Serverless Stack (SST) app"
---

## Checklist

After developing your project, and deciding it's time to go live with real users, you should run through this checklist.

- Make sure the default removal policy is **NOT set to `DESTROY`** for production environments.
- Make sure the **secrets are not stored in the code** and committed to Git. Store the secrets with the [CI provier](../environment-variables#environment-variables-in-seed) or use [AWS SSM](../environment-variables#working-with-secrets).
- Review the log retention setting for Lambda function log and API access log and ensure the number of days logs are kept in CloudWatch Logs fits your need.
- If you'd like extra visibility on your Lambda functions, consider using a [monitoring service](../monitoring-your-app-in-prod.md) for your function.
- It is recommended that you and people on your team **NOT have permission to deploy to production environments** from their local machine. Deployments to production environments should be done from a consistent environment like a CI server.

## Seed (Recommended)

The easiest way to deploy SST to production is to use [Seed](https://seed.run) from the creators of SST. Seed is a fully managed CI/CD pipeline for serverless apps on AWS.

### Getting started

If you haven’t already done so, push your SST app to a Git provider of your choice: [GitHub](https://github.com/), [GitLab](https://about.gitlab.com/), or [BitBucket](https://bitbucket.org/). Your repository can be private or public.

Then, follow these steps to [Add your SST App](https://seed.run/docs/adding-a-cdk-app#advantages-of-cdk-and-sst-on-seed).

### Pull Request workflow

By enabling the [Pull Request workflow](https://seed.run/docs/working-with-pull-requests), When a PR is opened, Seed will build, test, and deploy the pull request commits automatically into a new stage. The new pull request stage will be an independent clone of your production environment. By using the PR workflow, in addition to doing code reviews, you can do deployment previews.

### Optimized for SST

1. The fastest way to deploy CDK apps

  Seed automatically caches dependencies to speed up your builds.

2. Free

  Seed directly plugs into the SST deployment process. So when an SST app is waiting for CloudFormation to update your stacks, Seed pauses the build process and does this asynchronously. This allows Seed to make SST deployments very efficient and offer it to you for free!

## Other CI providers

Here is the list of steps to build and deploy SST apps on CI providers like **GitHub Actions**:

```bash
$ npm install
$ npx sst deploy --stage prod

# or

$ yarn
$ yarn sst deploy --stage prod
```
