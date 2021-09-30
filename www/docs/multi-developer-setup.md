---
id: multiple-developer-workflows
title: Multiple Developer Workflows
sidebar_label: Multiple Developer Workflows
description: "Various workflows you can use to setup SST across multiple developers on your team"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

When using SST with a team of developers, there are a few different workflows you can choose to keep things organized. We've documented three common patterns below that have various tradeoffs in security, complexity, and safety

## AWS SSO

No matter which workflow you choose, we strongly recommend setting up [AWS SSO](https://aws.amazon.com/blogs/security/how-to-create-and-manage-users-within-aws-sso/). Historically, you would issue IAM credentials to each developer on your team. However, these credentials usually had static keys associated with them that are easy to leak.

AWS SSO is built on issuing temporary credentials and implements best practices around credential management. It can be used stand-alone or with your existing SSO provider (Okta, Google Workspace, etc).


## Workflows

:::info
These docs refer to the concept of an "AWS Account". This is not referring to individual accounts tied to a user but rather the AWS account that was created for your organization to deploy resources into.
:::


### Single AWS Account

The simplest setup is a single AWS account to house all of your environments. This means local environments, development, staging and production are all in the same account and seperated through the use of stack naming.

#### Local Development
For local development you can start SST simply by doing
```
sst start
```

This will prompt you for a local stage name on first run that will prefix all the stacks you create as documented [here](/working-locally#local-environment).

Typically this coresponds to a developer's name so their stacks will look like this: `tom-myapp-stack1`. That ensures two developers deploying their local environment will not conflict with each other - so long as they use different stage names.

#### Staging
For deploying to staging, you can explicitly pass in a stage name:

```
sst deploy --stage=staging
```

This will deploy stacks that look like this `staging-myapp-stack1` instead of using the local environment name. 

#### Production
For deploying to production, similarly you can pass in a stage name
```
sst deploy --stage=production
```
This deploys stacks that look like this: `production-myapp-stack`

#### Pros
- Simplest option

#### Cons
- Poor security - developers have access to all environments
- Poor safety - development resources are side by side production resources. Easy to accidentally touch production data
- Hard to understand costs between different environments

### AWS Account per environment

A moderately complex setup involves creating a new AWS Account for each environment - typically `dev`, `staging`, and `production`. Spinning up multiple AWS Accounts might seem strange but is actually best practice.

AWS makes this easy to do with [AWS Organizations](https://aws.amazon.com/organizations/). You can create a master account associated with an organization and then easily create sub-accounts for each of your environments. Note, AWS SSO should be configured in the master account.

#### Local Development
For local development you can start SST by specifying the profile associated with the dev environment

```
AWS_PROFILE=dev-profile sst start
```

Just like in the [Single AWS Account](#single-aws-account) setup, this will prompt you for a local stage name on first run that will prefix all the stacks you create as documented [here](/working-locally#local-environment).

Typically this coresponds to a developer's name so their stacks will look like this: `tom-myapp-stack1`. That ensures two developers deploying their local environment will not conflict with each other - so long as they use different stage names.

#### Staging
For deploying to staging, you can pass in the profile associated with staging as well as a stage name

```
AWS_PROFILE=staging-profile sst deploy --stage=staging
```

This will deploy stacks that look like this `staging-myapp-stack1` into the staging account.

#### Production
For deploying to production, similarly you can pass in the production profile and stage name
```
AWS_PROFILE=production-profile sst deploy --stage=production
```
This deploys stacks that look like this: `production-myapp-stack` into the production account.


#### Pros
- Moderate security
- Moderate safety

#### Cons
- Added complexity of managing multiple AWS accounts
- Difficult to set resource constraints per developer

### AWS Account per environment and developer

This is the most complex setup and involves creating a new AWS Account for each environment - typically `dev`, `staging`, and `production` and also per developer. The benefits of doing this is you can make sure developers do not accidentally step on each other's resources. Additionally, you can see billing easily broken down by developer to see if anyone is misusing resources.

AWS makes it easy to spin up multiple environments with [AWS Organizations](https://aws.amazon.com/organizations/). You can create a master account associated with an organization and then easily create sub-accounts for each of your environments and developers. Note, AWS SSO should be configured in the master account.

#### Local Development
For local development you can start SST by specifying the profile associated with your personal aws account and specifying a dev stage.

```
AWS_PROFILE=personal-profile sst start --stage=dev
```
Since there are no other developers in your account, you do not need a unique stage name

#### Staging
For deploying to staging, you can pass in the profile associated with staging as well as a stage name

```
AWS_PROFILE=staging-profile sst deploy --stage=staging
```

This will deploy stacks that look like this `staging-myapp-stack1` into the staging account.

#### Production
For deploying to production, similarly you can pass in the production profile and stage name
```
AWS_PROFILE=production-profile sst deploy --stage=production
```
This deploys stacks that look like this: `production-myapp-stack` into the production account.


#### Pros
- Great security
- Great safety
- Full visibility into development costs

#### Cons
- Added complexity of managing multiple AWS accounts per developer
- Cannot share dev resources easily (eg seeded database)
