---
title: Git Push to Deploy
---

Now that our app is in production, we want to set it up so that when you `git push` your changes, they are deployed automatically via a CI/CD pipeline.

There are a couple of reasons to do this.

## Working with a team

While you are working on an app together with a team, you want all your changes to be merged and deployed together. If the entire team uses the CLI to deploy, you could have a scenario where:

1. Bob adds a new feature locally and runs `sst deploy --stage prod`.
2. The new feature is in production.
3. Alice working on a new feature separately also runs `sst deploy --stage prod`.
4. Alice's version of the app is now in production and has overwritten Bob's version.

To fix this, teams do a couple of things.

1. Commit their code to Git.
2. Work in separate branches:
   - So Bob has a branch called `featureA`
   - And Alice has one called `featureB`
3. Merge their changes to `master` when they are ready to push to production.
4. Have a separate CI/CD service that deploy the `master` branch to production. So any changes pushed to `master` are auto-deployed.

This is typically called `git push` to deploy.

## Pull Request workflow

Many teams like to take the `git push` to deploy workflow further. They prefer being able to preview their changes before pushing it to production.

To do this:

1. Bob first creates a PR with the `featureA` branch.
2. This is deployed to a separate stage by running `--stage featureA`. These PR stages are also called preview environments or stages.
3. Bob's manager is able to test the feature in the new preview stage.
4. The PR is then merged to `master`. This deploys the changes to production.
5. While, the PR stage is automatically removes when the PR is closed.

:::info
The pay-per-use and scale to 0 model of serverless makes it easy and cost-effective for teams to embrace a git workflow complete with feature branches and preview environments.
:::

These preview stages are great for collaboration and having a consistent workflow for pushing to production.

## CI/CD

To get started with a Git workflow, you want to first push your code to a Git provider. You can use something like [GitHub](https://github.com) for this. Then connect it to a CI/CD service that deploys your app for you.

There are a bunch of general purpose CI/CD services out there. We'll look at them below. These are desgined to work with different kinds of applications and workflows. This means that you need to specify how your application is deployed and the kind workflow you want.

On the other hand, there's [Seed](https://seed.run).

### Seed

[Seed](https://seed.run) is built by the team behind SST and is designed specifically for serverless apps. So there's nothing to configure.

:::tip
We recommend using [Seed](https://seed.run) to `git push` to deploy your SST apps.
:::

There are a couple of other reasons why Seed is a good fit for SST apps.

1. **Speed**

   It's the fastest way to deploy SST apps. Seed automatically caches dependencies to speed up your builds.

2. **Free**

   Seed also directly plugs into the SST deployment process. So when an SST app is waiting for CloudFormation to update your stacks, Seed pauses the build process and does this asynchronously. This allows Seed to make SST deployments very efficient and offer it to you for free!

Once your app is in a repo with GitHub, or similar; follow these steps in the Seed docs to [add your SST app](https://seed.run/docs/adding-a-cdk-app).

### Other providers

Other general purpose CI/CD providers include:

- [Github Actions](https://github.com/features/actions)
- [Travis CI](https://www.travis-ci.com)
- [CircleCI](https://circleci.com)

You'll need to add a build script to set things up.

- Deploy to prod using `sst deploy --stage prod` when you push to `master`.
- Deploy a new preview environment when a PR is created `sst deploy --stage <pr>`.
- Remove the preview environment when the PR is closed `sst remove --stage <pr>`.

## Next steps

And that's it! You now know the basics of SST and have a solid background on the setup that we recommend.

Your fully functioning app is also deployed and ready to be shared. You can manage it with the [SST Console](../console.md) and Git push to deploy it with [Seed](https://seed.run)!

If you are looking to extend this setup, check out the [sidebar of the docs](/). We have detailed chapters on specific aspects of building a full-stack app.
