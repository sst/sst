---
title: Architecture 🟢
description: "Docs for the "
---

## Overview

SST provides all the basic building blocks you need to create a fullstack serverless application.

### Constructs

Constructs are the basic building blocks of SST apps. Each construct consists of multiple AWS resources to make up a functional unit. SST picks sensible defaults for the underlying resources so you are not exposed to all the complexity up front. Read more about SST's [Progressive disclosure principle](../design-principles#progressive-disclosure).

For example, [`Api`](../constructs/Api.md) is a commonly used construct to create a RESTful backend API. It consists of an AWS API Gateway project, and a couple of Lambda Functions among others.

```js
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
  },
});
```

### Stacks

Stacks are a way to organize your constructs. There is no right or wrong way to organize your constructs. It is a common pattern to organize your constructs by domain. For example, if you are building a Twitter clone, you might have:
- A `core` stack with the API and the database;
- A `digest` stack with a Cron job that sends people daily digest;
- A `web` stack with a React web app.

Here is an example of a stack with an API and a database table.

```js
class CoreStack extends Stack {

  constructor(scope, id) {
    super(scope, id);

    // Create an API
    new Api(this, "Api", {
      routes: {
        "GET    /notes": "src/list.main",
        "POST   /notes": "src/create.main",
      },
    });

    // Create an Table
    new Table(this, "Notes", {
      fields: {
        noteId: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "noteId" },
    });
  }
}
```

### App

An app consists of one or more stacks. In most cases your entire stack should be deployed as a single app.

```js
export default function main(app) {
  new CoreStack(app, "core");
  new DigestStack(app, "digest");
  new WebStack(app, "web");
}
```

### Stage

A stage is an environment that the app is deployed to. Typically you work in a development environment that is an independent clone of your production environment. This allows you to test and ensure that the version of code that you are about to deploy is good to go.

By default, the stacks in a CDK app can be deployed to multiple AWS accounts and regions. This doesn't work well when trying to support a separate development environment. Like the one `sst start` creates.

To fix this, SST has the notion of stages. An SST app can be deployed separately to multiple environments (or stages). A stage is simply a string to distinguish one environment from another.

Behind the scenes, SST uses the name of the app and stage to prefix the resources in the app. This ensures that if an app is deployed to two different stages in the same AWS account, the resource names will not clash. You can also prefix resource names in your stacks by calling the [`logicalPrefixedName`](constructs/App.md#logicalprefixedname) method in [`sst.App`](constructs/App.md).

```js
this.node.root.logicalPrefixedName("MyResource"); // "dev-my-sst-app-MyResource"
```

So if you want to deploy to a stage called prod:

```bash
npx sst deploy --stage prod
```

## Infrastructure vs Function

Some constructs use Lambda functions. For example, each route in an [`Api`](../constructs/Api.md) construct is a Lambda function. The infrastructure code and the function code sits inside the same repo.

Read more about [Project layout](../installation.md#project-layout).

## Deployed to your AWS account

Your SST app is always deployed to your AWS account. Read more about [Managing the IAM credentials](../managing-iam-credentials.md) used by SST to deploy.

## CloudFormation

Under the hood, SST compiles each stack into a CloudFormation template, and deployed as a CloudFormation stack. 

### Moving constructs across stacks

Once your app is deployed, moving a construct between stacks requires destroying the construct from the old stack, and recreating it in the new stack. In the case of a [`Table`](../constructs/Table.md) or a [`Bucket`](../constructs/Bucket.md), the data is lost. And in the case of an [`Api`](../constructs/Api.md), the API endpoint will change upon recreate.
