---
title: Migrating From CDK
sidebar_label: CDK
description: "Migrating from AWS CDK to SST"
---

:::note
You can use all the CDK constructs in an SST app. This doc describes how to turn a CDK app into an SST app.
:::

SST is an extension of [AWS CDK](https://aws.amazon.com/cdk/). It's fairly simple to move a CDK app to SST. You just need to account for a couple of small differences:

1. There is no `cdk.json`

   If you have a `context` block in your `cdk.json`, you can move it to a `cdk.context.json`. You can [read more about this here](https://docs.aws.amazon.com/cdk/latest/guide/context.html). You'll also need to add a `sst.json` config file, as [talked about here](../learn/project-structure.md#sstjson). Here is a sample config for reference.

   ```json
   {
     "name": "my-sst-app",
     "stage": "dev",
     "region": "us-east-1"
   }
   ```

2. There is no `bin/*.js`

   Instead there is a `stacks/index.js` that has a default export function where you can add your stacks. SST creates the App object for you. This is what allows SST to ensure that the stage, region, and AWS accounts are set uniformly across all the stacks. Here is a sample `stacks/index.js` for reference.

   ```js
   import MyStack from "./MyStack";

   export default function main(app) {
     new MyStack(app, "my-stack");

     // Add more stacks
   }
   ```

3. Stacks are written as functions

   Your classes are written as functions instead of `cdk.Stack`. Here is what the JavaScript version looks like.

   ```js
   import * as sst from "@serverless-stack/resources";

   export function MyStack(ctx) {}
   ```

   And in TypeScript.

   ```ts
   import * as sst from "@serverless-stack/resources";

   export function MyStack(ctx: sst.StackContext) {}
   ```

4. Lambdas use `sst.Function`

   Use the [`sst.Function`](constructs/Function.md) construct instead of `cdk.lambda.NodejsFunction`.

5. Include the right packages

   You don't need the `aws-cdk` package in your `package.json`. Instead you'll need [`sst`](packages/sst.md) package.
