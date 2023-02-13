---
title: Working With Your Team
description: "How to use SST with a team of developers."
---

When using SST with a team of developers, there are a few different workflows you can choose to keep things organized. We've documented the three most common patterns below. We've also listed the various tradeoffs in security, complexity, and safety.

:::info
In this doc we refer to the concept of an _"AWS Account"_. This is not the individual accounts tied to a user but rather the AWS account that was created for your organization to deploy resources into.
:::

## AWS SSO

Regardless of the workflow you choose, we strongly recommend setting up [AWS SSO](https://aws.amazon.com/blogs/security/how-to-create-and-manage-users-within-aws-sso/). Historically, you would issue [IAM credentials](https://sst.dev/chapters/create-an-iam-user.html) to each developer on your team. However, these credentials usually had static keys associated with them that are easy to leak.

AWS SSO is built on issuing temporary credentials and implements best practices around credential management. It can be used stand-alone or with your existing SSO provider (Okta, Google Workspace, etc).

## Workflows

Let's look at the common workflows.

### Single AWS Account

The simplest setup is a single AWS account to house all of your environments. This means local environments, development, staging, and production are all in the same account. They are separated by including the name of the stage in the stacks.

You also need to create separate IAM accounts for each of your developers.

#### Local Development

For local development run.

```bash
npx sst dev
```

This will prompt you for a local stage name when you first run it and will prefix all the stacks with it. You can [read more about this here](live-lambda-development.md#starting-the-local-environment).

Typically this corresponds to a developer's name so their stacks will look like: `tom-myapp-stack1`, or `$user_name-$app_name-$stack_name`. This ensures that two developers deploying their local environments will not conflict with each other, since they are using different stage names.

:::note
SST is designed to give each developer their own isolated development environment. If two people run `sst dev` with the same stage name, the person that connected first will get disconnected when the second person connects.
:::

#### Staging

For deploying to staging, you explicitly pass in the stage name.

```bash
npx sst deploy --stage staging
```

This will deploy stacks that look like this `staging-myapp-stack1`, instead of using the local stage name.

#### Production

For deploying to production, similarly you pass in the stage name.

```bash
npx sst deploy --stage production
```

This deploys stacks that look like, `production-myapp-stack`.

#### Pros

- This is the simplest option.

#### Cons

- Poor security: Developers have access to all environments.
- Poor safety: Development resources are side by side production resources. It's easy to accidentally touch production data.
- Hard to understand costs between different environments.

### AWS Account per environment

A moderately complex setup involves creating a new AWS Account for each environment - typically `dev`, `staging`, and `production`. Spinning up multiple AWS Accounts might seem strange but is actually best practice.

AWS makes this easy to do with [AWS Organizations](https://sst.dev/chapters/manage-aws-accounts-using-aws-organizations.html). You can create a master account associated with an organization and then easily create sub-accounts for each of your environments. Note, AWS SSO should be configured in the master account.

#### Local Development

For local development you can start SST by specifying the profile associated with the dev environment.

```
AWS_PROFILE=dev-profile npx sst dev
```

Just like in the [Single AWS Account](#single-aws-account) setup, this will [prompt you for a local stage name](live-lambda-development.md#starting-the-local-environment) when first run and prefix all your stacks.

Locally you can set this profile as the `default` one in your `~/.aws/credentials`.

```bash
[default]
aws_access_key_id = BNMYJSSP5PTLBDBRSWPO
aws_secret_access_key = 7yuIM8xNf17ue+DDyOcQizDCKaTVhYevKflZONTe

[dev-profile]
aws_access_key_id = BNMYJSSP5PTLBDBRSWPO
aws_secret_access_key = 7yuIM8xNf17ue+DDyOcQizDCKaTVhYevKflZONTe
```

Allowing you to run `npx sst dev` just as before.

#### Staging

For deploying to staging, you need to pass in the profile associated with staging as well as the stage name.

```bash
AWS_PROFILE=staging-profile npx sst deploy --stage staging
```

This will deploy stacks that look like, `staging-myapp-stack1` into the staging account.

#### Production

For deploying to production, similarly you can pass in the production profile and stage name

```bash
AWS_PROFILE=production-profile npx sst deploy --stage production
```

This deploys stacks that look like, `production-myapp-stack` into the production account.

#### Pros

- Better security: You can restrict access to just the dev account.
- Better safety: With restricted access, developers cannot accidentally touch production resources.

#### Cons

- Added complexity of managing multiple AWS accounts.
- Difficult to manage resource constraints per developer.
- Developers can still touch resources that other developers are using.

### AWS Account per environment and developer

This is the most complex setup and involves creating a new AWS Account for each environment - typically `dev`, `staging`, and `production`, and also one per developer. The benefits of doing this is that you can make sure developers do not accidentally touch each other's resources. Additionally, you can see billing easily broken down per developer, to ensure that nobody is misusing resources.

AWS makes it easy to spin up multiple environments with [AWS Organizations](https://sst.dev/chapters/manage-aws-accounts-using-aws-organizations.html). You can create a master account associated with an organization and then easily create sub-accounts for each of your environments and developers. Note, AWS SSO should be configured in the master account.

#### Local Development

For local development you can start SST by specifying the profile associated with your personal AWS account and specifying a dev stage.

```bash
AWS_PROFILE=personal-profile npx sst dev --stage dev
```

We can take this a step further. Locally you can set this profile as the `default` one in your `~/.aws/credentials`.

```bash
[default]
aws_access_key_id = BNMYJSSP5PTLBDBRSWPO
aws_secret_access_key = 7yuIM8xNf17ue+DDyOcQizDCKaTVhYevKflZONTe
[personal-profile]
aws_access_key_id = BNMYJSSP5PTLBDBRSWPO
aws_secret_access_key = 7yuIM8xNf17ue+DDyOcQizDCKaTVhYevKflZONTe
```

Update the `start` script in your `package.json`.

```json
"scripts": {
  "test": "sst test",
  "dev": "sst dev --stage dev",
  "build": "sst build",
  "deploy": "sst deploy",
  "remove": "sst remove"
},
```

Allowing everybody on your team to just run `npx sst dev`.

Note that, we don't need a unique stage name, since there are no other developers in your account.

#### Staging

For deploying to staging, you can pass in the profile associated with staging as well as a stage name.

```bash
AWS_PROFILE=staging-profile npx sst deploy --stage staging
```

This will deploy stacks that look like, `staging-myapp-stack1` into the staging account.

#### Production

For deploying to production, similarly you can pass in the production profile and stage name.

```bash
AWS_PROFILE=production-profile npx sst deploy --stage production
```

This deploys stacks that look like, `production-myapp-stack` into the production account.

#### Pros

- Most secure: Developers only have access to their personal environments.
- Most safe: Developers cannot accidentally affect other resources.
- Full visibility into development costs

#### Cons

- Added complexity of managing multiple AWS accounts per developer.
- Cannot share dev resources easily. For example, a seeded database for development.
