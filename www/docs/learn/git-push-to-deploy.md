---
title: Git Push to Deploy
---

It's a good idea to create a CI/CD pipeline to deploy your SST apps to production. It allows you to work together with your team. There are a couple of ways to do so. 

## Seed (Recommended)

The easiest way to deploy SST to production is to use [Seed](https://seed.run). Seed is a fully-managed CI/CD pipeline for serverless apps on AWS. It's built by the creators of SST.

There are a couple of other reasons why Seed is a good fit for SST apps.

1. **Speed**

   It's the fastest way to deploy SST apps. Seed automatically caches dependencies to speed up your builds.

2. **Free**

   Seed also directly plugs into the SST deployment process. So when an SST app is waiting for CloudFormation to update your stacks, Seed pauses the build process and does this asynchronously. This allows Seed to make SST deployments very efficient and offer it to you for free!

### Getting started

If you haven’t already done so, push your SST app to a Git provider of your choice: [GitHub](https://github.com/), [GitLab](https://about.gitlab.com/), or [BitBucket](https://bitbucket.org/). Your repository can be private or public.

Then, follow these steps in the Seed docs to [add your SST app](https://seed.run/docs/adding-a-cdk-app#advantages-of-cdk-and-sst-on-seed).

### Pull Request workflow

By enabling the [Pull Request workflow](https://seed.run/docs/working-with-pull-requests), when a PR is opened, Seed will build, test, and deploy the pull request commits automatically to a new stage. The new pull request stage will be an independent clone of your production environment.

Using the PR workflow allows you to share deployment previews with your team. This, in addition to doing code reviews allows you to have a consistent process around how changes get pushed to production.

## Other providers

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

And that's it! You have a fully functioning app deployed and ready to be used. You can manage it with the [SST Console](../console.md) and Git push to deploy it with [Seed](https://seed.run).
