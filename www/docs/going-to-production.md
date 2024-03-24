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

---

### Manual setup

To setup OpenID Connect manually:

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

3. Head over to your GitHub workflow file. Add these lines to authenticate and deploy on push:

   ```diff
    name: SST workflow
    on: push

    # Concurrency group name ensures concurrent workflow runs wait for any in-progress job to finish
    concurrency:
      group: merge-${{ github.ref }}

    permissions:
      id-token: write # This is required for requesting the JWT
      contents: read # This is required for actions/checkout

    jobs:
      DeployApp:
        runs-on: ubuntu-latest
        env:
        #Define your envs needed for static generation:
        # ENV_NAME: ${{ secrets.ENV_NAME }}
        steps:
          - name: Git clone the repository
            uses: actions/checkout@v3
          - name: Configure AWS credentials
            uses: aws-actions/configure-aws-credentials@v3
            with:
              role-to-assume: arn:aws:iam::1234567890:role/GitHub
              role-duration-seconds: 3600 #adjust as needed for your build time
              aws-region: us-east-1
          - name: Deploy app
            run: |
              npm i && npx sst deploy --stage prod
   ```

   Make sure to replace `1234567890` and `us-east-1` with your AWS account ID and region.

---

### Stacks setup

To setup OpenID Connect using a construct:

1. Create a new stack in your app.

   ```ts
   import { Duration } from 'aws-cdk-lib';
   import * as iam from 'aws-cdk-lib/aws-iam';
   import { StackContext } from 'sst/constructs';
 
   export function IAM({ app, stack }: StackContext) {
     if (app.stage === 'prod') {
 
       const provider = new iam.OpenIdConnectProvider(stack, 'GitHub', {
         url: 'https://token.actions.githubusercontent.com',
         clientIds: ['sts.amazonaws.com'],
       });
 
       const organization = 'my-org'; // Use your GitHub organization
       const repository = 'my-repo'; // Use your GitHub repository
 
       new iam.Role(stack, 'GitHubActionsRole', {
         assumedBy: new iam.OpenIdConnectPrincipal(provider).withConditions({
           StringLike: {
             'token.actions.githubusercontent.com:sub': `repo:${organization}/${repository}:*`,
           },
         }),
         description: 'Role assumed for deploying from GitHub CI using AWS CDK',
         roleName: 'GitHub', // Change this to match the role name in the GitHub workflow file
         maxSessionDuration: Duration.hours(1),
         inlinePolicies: { // You could attach AdministratorAccess here or constrain it even more, but this uses more granular permissions used by SST
           SSTDeploymentPolicy: new iam.PolicyDocument({
             assignSids: true,
             statements: [
               new iam.PolicyStatement({
                 effect: iam.Effect.ALLOW,
                 actions: [
                   'cloudformation:DeleteStack',
                   'cloudformation:DescribeStackEvents',
                   'cloudformation:DescribeStackResources',
                   'cloudformation:DescribeStacks',
                   'cloudformation:GetTemplate',
                   'cloudformation:ListImports',
                   'ecr:CreateRepository',
                   'iam:PassRole',
                   'iot:Connect',
                   'iot:DescribeEndpoint',
                   'iot:Publish',
                   'iot:Receive',
                   'iot:Subscribe',
                   'lambda:GetFunction',
                   'lambda:GetFunctionConfiguration',
                   'lambda:UpdateFunctionConfiguration',
                   's3:ListBucket',
                   's3:PutObjectAcl',
                   's3:GetObject',
                   's3:PutObject',
                   's3:DeleteObject',
                   's3:ListObjectsV2',
                   's3:CreateBucket',
                   's3:PutBucketPolicy',
                   'ssm:DeleteParameter',
                   'ssm:GetParameter',
                   'ssm:GetParameters',
                   'ssm:GetParametersByPath',
                   'ssm:PutParameter',
                   'sts:AssumeRole',
                 ],
                 resources: [
                   '*',
                 ],
               }),
             ],
           }),
         },
       });
     }
   }    
   ```

2. Deploy your application to your production stage.
    - Since the Identity Provider is global make sure to remove any existing provider for GitHub in your account before deploying this stack.

3. Use the same GitHub workflow file from the manual setup above to authenticate with AWS.
