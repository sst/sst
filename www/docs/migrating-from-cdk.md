---
id: migrating-from-cdk
title: Migrating From CDK
description: "Migrating from AWS CDK to Serverless Stack (SST)"
---

SST is an extension of [AWS CDK](https://aws.amazon.com/cdk/). And it's fairly simple to move a CDK app to SST. You just need to account for a couple of small differences:

1. There is no `cdk.json`

   If you have a `context` block in your `cdk.json`, you can move it to a `cdk.context.json`. You can [read more about this here](https://docs.aws.amazon.com/cdk/latest/guide/context.html). You'll also need to add a `sst.json` config file, as [talked about here](installation.md#project-config). Here is a sample config for reference.

   ```json
   {
     "name": "my-sst-app",
     "stage": "dev",
     "region": "us-east-1"
   }
   ```

2. There is no `bin/*.js`

   Instead there is a `lib/index.js` that has a default export function where you can add your stacks. SST creates the App object for you. This is what allows SST to ensure that the stage, region, and AWS accounts are set uniformly across all the stacks. Here is a sample `lib/index.js` for reference.

   ```js
   import MyStack from "./MyStack";

   export default function main(app) {
     new MyStack(app, "my-stack");

     // Add more stacks
   }
   ```

3. Stacks extend `sst.Stack`

   Your stack classes extend [`sst.Stack`](constructs/stack.md) instead of `cdk.Stack`. Here is what the JavaScript version looks like.

   ```js
   import * as sst from "@serverless-stack/resources";

   export default class MyStack extends sst.Stack {
     constructor(scope, id, props) {}
   }
   ```

   And in TypeScript.

   ```ts
   import * as sst from "@serverless-stack/resources";

   export class MyStack extends sst.Stack {
     constructor(scope: sst.App, id: string, props?: sst.StackProps) {}
   }
   ```

4. Lambdas use `sst.Function`

   Use the [`sst.Function`](constructs/function.md) construct instead to the `cdk.lambda.NodejsFunction`.

5. Include the right packages

   You don't need the `aws-cdk` package in your `package.json`. Instead you'll need [`@serverless-stack/cli`](packages/cli.md) and [`@serverless-stack/resources`](packages/resources.md).
