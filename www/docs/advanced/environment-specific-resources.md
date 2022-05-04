---
title: Environment Specific Resources
description: "Learn how to customize your resources based on the environment of a Serverless Stack (SST) app."
---

For most of your resources, you want them to be identical across every environment (ie. dev, staging, prod). So your development environments are as close of a clone to the production environment as possible. But sometimes, you might want to customize resources based on the deployed environment.

Here are a couple of examples on how to do that.

## Conditionally configure resources

For example, set a Lambda function's memory size based on the environment.

```js {7} title="stacks/MyStack.js"
export function MyStack(ctx) {
  new sst.Function(ctx.stack, "MyFunction", {
    handler: "src/lambda.main",
    memorySize: ctx.app.stage === "prod" ? 2048 : 256,
  });
}
```

## Conditionally create resources

For example, run a cron job to perform a periodic task only in the `prod` environment.

```js {5-10} title="stacks/MyStack.js"
export function MyStack(ctx) {
  if (ctx.app.stage === "prod") {
    new Cron(ctx.stack, "Cron", {
      schedule: "rate(1 minute)",
      job: "src/lambda.main",
    });
  }

  // Add more resources
}
```

## Conditionally create stacks

For example, only deploy a Stack in the `dev` environment.

```js {2-4} title="stacks/index.js"
export default function main(app) {
  if (app.stage === "dev") {
    new DevStack(app, "dev-stack");
  }

  // Add stacks
}
```

## Sharing resources across stages

If you have resources in your app that have an upfront cost to provision, such as a VPC NAT Gateway or an RDS cluster, you can create that resource in one stage and reuse it in other stages.

Here is an example of creating a VPC in the `dev` stage, and sharing it with the `dev-feature-a` and `dev-feature-b` stages. Note that the `dev` stage needs to be deployed before the other stages, for them to be able to look up the deployed VPC.

```js title="stacks/VPCStack.js"
import * as ec2 from "@aws-cdk/aws-ec2";

function MyStack(ctx) {
  if (scope.stage === "dev") {
    ctx.stack.vpc = new ec2.Vpc(ctx.stack, "VPC");
  }
  else if (scope.stage.startsWith("dev-feature-")) {
    const vpcId = ""; // look up the ID of the VPC created in the "dev" stage
    ctx.stack.vpc = ec2.Vpc.fromLookup(ctx.stack, 'VPC', { vpcId });
  }
}
```
