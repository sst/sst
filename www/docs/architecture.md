---
title: Architecture
description: "Learn about how SST apps are structured."
---

SST provides all the basic building blocks you need to create a full-stack serverless application. In this chapter we'll look at how SST apps are structured.

:::info

Under the hood, SST uses [CDK](https://aws.amazon.com/cdk/) to compile your infrastructure into a [CloudFormation template](https://aws.amazon.com/cloudformation/resources/templates/). These templates are then deployed as CloudFormation stacks. 

:::

### Constructs

The infrastructure in an SST app is defined using basic building blocks called, [**Constructs**](constructs/index.md). Each construct consists of multiple AWS resources to make up a functional unit. SST picks sensible defaults for the underlying resources, so you are not exposed to all the complexity up front.

For example, [`Api`](constructs/Api.md) is a commonly used construct to create a backend API. It consists of an AWS API Gateway project, Lambda functions, and a few other AWS resources. But it uses sensible defaults to help you get started quickly:

```js
new Api(this, "Api", {
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});
```

Our constructs follow the principle of [Progressive disclosure design](design-principles.md#progressive-disclosure).

### Stacks

Stacks are a way to organize your constructs.

```js
function ApiStack() {
  const api = new Api(this, "Api", {
    routes: {
      "GET  /notes": "src/list.main",
      "POST /notes": "src/create.main",
    },
  });

  return { api };
});
```

There is no universal way to organize them. However, you should try to opt for more granular stacks. This is because [CloudFormation](https://aws.amazon.com/cloudformation/) can be slow and the fewer resources there are in a stack, the less complexity there is during deployment.

For example, if you are building a Twitter clone, you might have:

- An `api` stack with the APIs
- A `database` stack with a DynamoDB Table
- A `web` stack with a React web app for the frontend 
- A `digest` stack with a Cron job that sends people daily email digest

:::caution Moving constructs

Once your app has been deployed, moving a construct between stacks requires destroying the construct from the old stack, and recreating it in the new stack. In the case of a [`Table`](constructs/Table.md) or [`Bucket`](constructs/Bucket.md) construct, the data is lost. And in the case of an [`Api`](constructs/Api.md), the API endpoint will change when it's recreated.

:::

### Apps

An app consists of one or more stacks. In most cases, all of your stacks should be deployed in a single app.

```js title="stacks/index.js"
export default function main(app) {
  app
    .stack(DBStack)
    .stack(ApiStack)
    .stack(WebStack)
    .stack(DigestStack)
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

Behind the scenes, SST uses the name of the app and stage to prefix the resources in the app. This ensures that if an app is deployed to two different stages in the same AWS account, the resource names will not clash. You can also prefix resource names in your stacks by calling the [`logicalPrefixedName`](constructs/App.md#logicalprefixedname) method in the [`App`](constructs/App.md) construct.

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

SST is designed to have both the infrastructure code and function code sit in the same repo. You can read more about SST's [project layout](learn/project-structure.md).

## AWS accounts

An SST app is deployed to an AWS account. The `sst deploy` command uses the local IAM credentials to deploy your app.

So make sure to [set up the IAM credentials](advanced/iam-credentials.md) in your local machine.
