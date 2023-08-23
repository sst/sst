---
title: Going to Production
description: "Deploy your SST apps to production."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Tips on deploying your SST apps to production.

</HeadlineText>

---

## Deploy from CLI

If you are an individual developer or just testing out SST; the easiest way to go to production is by using the CLI.

```bash
npx sst deploy --stage prod
```

The `--stage` takes a string and uses it to namespace all the resources in your application. This allows you to create a separate environment for production.

---

## Deploy from Git

If you are working on an SST app as a team, you don't want to deploy using the CLI because you might end up overwriting each other's changes.

Instead you should set it up so that your changes are deployed when you push your changes to Git. So if you have a CI/CD provider like, [GitHub Actions](https://github.com/features/actions) or [Travis](https://www.travis-ci.com) connected to your Git repo. You can add a script that'll run the `sst deploy` command when you push to `master`.

---

### PR workflow

Additionally, since you are using serverless, it makes sense to have separate environments per feature or pull request.

:::info
Serverless and SST makes it easy and cost-effective for teams to embrace a Git workflow complete with feature branches and preview environments.
:::

With this workflow, you can add a deploy script in your CI/CD provider to run:

```bash
npx sst deploy --stage <PR>
```

Where `<PR>` is the name or number of the PR. This'll give you a _preview_ environment. It'll allow your team to test the new feature and make changes. Once you are ready, you can merge the change to `master` and run `sst remove` to tear down the preview environment.

---

### CI/CD build script

To configure the Git and PR workflow, you'll need to add a build script. The specific script depends on the service you use but here's roughly what you'll need to do:

- Deploy to prod using `sst deploy --stage prod` when you push to `master`.
- Deploy a new preview environment when a PR is created `sst deploy --stage <PR>`.
- Remove the preview environment when the PR is closed `sst remove --stage <PR>`.

---

## Deploy from Seed

The recommended way to deploy your SST apps is to use [Seed](https://seed.run). It's built by the team behind SST and is designed specifically for serverless apps. So there's no need to write a build script to configure the Git workflow.

:::tip
We recommend using [Seed](https://seed.run) to `git push` to deploy your SST apps.
:::

It supports the pull request workflow and automatically setting up and tearing down preview deployments out of the box.

There are a couple of other reasons why Seed is a good fit for SST.

1. **Speed**

   It's the fastest way to deploy your apps. Seed automatically caches dependencies to speed up your builds.

2. **Free**

   Seed also directly plugs into the SST deployment process. So when an SST app is waiting for CloudFormation to update your stacks, Seed pauses the build process and does this asynchronously. This allows Seed to make SST deployments very efficient and offer it to you for free!

Once your app is in a Git repo, follow these steps in the Seed docs to [add your SST app](https://seed.run/docs/adding-a-cdk-app).


---

## Deploy from GitHub Actions

In your GitHub workflow, it is recommended to [use OpenID Connect to authenticate with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services).

To setup OpenID Connect:

1. Go to AWS IAM Console, and add an Identity provider with the following data.
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`

   ![AWS IAM Console add Identity provider](/img/going-to-production/aws-iam-console-add-identity-provider.png)

2. In the AWS IAM Console, create an IAM Role with the following data.
   - Trusted entity type: Web identity
   - Identity provider: `token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
   - GitHub organization: your GitHub organization

   You can leave GitHub repository and branch field empty if you want to all your repos to use this role to authenticate with AWS.

   On the next screen, check the `AdministratorAccess` policy. Optional you can select `Create policy` to customize IAM permissions.

   On the next screen, enter `GitHub` for the `Role name`. And select `Create role`.

3. Head over to your GitHub workflow file. Add these lines to authenticate:
   ```diff
     name: SST workflow
     on:
       push

     # permission can be added at job level or workflow level    
   + permissions:
   +   id-token: write   # This is required for requesting the JWT
   +   contents: read    # This is required for actions/checkout

      jobs:
        DeployApp:
          runs-on: ubuntu-latest
          steps:
            - name: Git clone the repository
              uses: actions/checkout@v3
   +        - name: configure aws credentials
   +          uses: aws-actions/configure-aws-credentials@v2
   +          with:
   +            role-to-assume: arn:aws:iam::1234567890:role/GitHub
   +            aws-region: us-east-1
            - name: Deploy app
              run: |
                pnpm sst deploy
   ```

   Make sure to replace `1234567890` and `us-east-1` with your AWS account ID and region.