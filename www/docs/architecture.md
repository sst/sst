---
title: Architecture
description: "Learn about how Serverless Stack (SST) apps are structured."
---

SST provides all the basic building blocks you need to create a full-stack serverless application. An SST app is roughly made up of:

1. Code that defines your infrastructure.
2. Code that powers your Lambda functions, or your _application code_.

Let's look at the two in detail.

## Infrastructure

The Infrastructure of your SST app is defined using [AWS CDK](https://aws.amazon.com/cdk/). It allows you to use real programming languages to define your infrastructure. SST currently supports JavaScript and TypeScript for your infrastructure code.

The infrastructure portion of an SST app is made up of the following.

### Constructs

Constructs are the basic building blocks of SST apps. Each construct consists of multiple AWS resources to make up a functional unit. SST picks sensible defaults for the underlying resources, so you are not exposed to all the complexity up front.

For example, [`Api`](constructs/Api.md) is a commonly used construct to create a RESTful backend API. It consists of an AWS API Gateway project, Lambda functions, and a few other AWS resources. But it's wrapped up with sensible defaults to help you get started.

```js
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
  },
});
```

You can read more about SST's [Progressive disclosure design](design-principles#progressive-disclosure).

### Stacks

Stacks are a way to organize your constructs. There is no right or wrong way to organize your constructs.

However, it's a common pattern to organize your constructs by domain. For example, if you are building a Twitter clone, you might have:

- A `core` stack with the API and the database
- A `web` stack with a React web app for the frontend
- A `digest` stack with a Cron job that sends people daily email digest

Here is an example of a stack with an API and a database table.

```js title="stacks/CoreStack.js"
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

A quick note on moving constructs across stacks. Once your app has been deployed, moving a construct between stacks requires destroying the construct from the old stack, and recreating it in the new stack. In the case of a [`Table`](constructs/Table.md) or [`Bucket`](constructs/Bucket.md) construct, the data is lost. And in the case of an [`Api`](constructs/Api.md), the API endpoint will change when it's recreated.

### Apps

An app consists of one or more stacks. In most cases, all of your stacks should be deployed in a single app.

```js title="stacks/index.js"
export default function main(app) {
  new CoreStack(app, "core");
  new WebStack(app, "web");
  new DigestStack(app, "digest");
}
```

### Stages

A stage is an environment that the app is deployed to. Typically you should work in a development environment that is an independent clone of your production environment. This allows you to test and ensure that the version of code you are about to deploy is good to go.

By default, the stacks in a CDK app can be deployed to multiple AWS accounts and regions. This doesn't work well when trying to support a separate development environment. Like the one [`sst start`](packages/cli.md#start) creates.

To fix this, SST has a notion of stages. An SST app can be deployed separately to multiple environments (or stages). A stage is simply a string to distinguish one environment from another.

So if you want to deploy to a stage called prod:

```bash
npx sst deploy --stage prod
```

Behind the scenes, SST uses the name of the app and stage to prefix the resources in the app. This ensures that if an app is deployed to two different stages in the same AWS account, the resource names will not clash. You can also prefix resource names in your stacks by calling the [`logicalPrefixedName`](constructs/App.md#logicalprefixedname) method in [`sst.App`](constructs/App.md).

```js
this.node.root.logicalPrefixedName("MyResource"); // "dev-my-sst-app-MyResource"
```

## Functions

Some SST constructs use [Lambda functions](https://aws.amazon.com/lambda/). For example, each route in an [`Api`](constructs/Api.md) construct is a Lambda function. This represents your application code. Your function code can be in JavaScript, TypeScript, Python, Golang, and C#.

A JavaScript or TypeScript Lambda function in SST is usually defined using the following format:

```
"path/to/file.functionName"
```

Where `functionName` is the function exported by the given file.

SST is designed to have both the infrastructure code and function code sit in the same repo. You can read more about SST's [Project layout](installation.md#project-layout).

## Deployed to your AWS account

Your SST app is deployed to your AWS account. Make sure to [set up the IAM credentials](advanced/iam-credentials.md) that SST will use to deploy your app.

## CDK and CloudFormation

Under the hood, SST uses AWS CDK to compile each stack into a [CloudFormation template](https://aws.amazon.com/cloudformation/resources/templates/), and deployed as a CloudFormation stack. 
