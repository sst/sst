---
title: Permission Boundary
description: "Learn how to set a permission boundary for the IAM users and roles in your Serverless Stack (SST) app."
---

A Permission Boundary is a way to define the maximum scope of permissions a user or role can have. It limits the user or role's permissions but does not specify the actual permissions.

## Setting the permission boundary

To set a permission boundary on all IAM users and roles created in your [`Stack`](../constructs/Stack.md) instances, you can do the following.

```js title="stacks/MyStack.js"
import * as iam from '@aws-cdk/aws-iam';

export function MyStack(ctx) {
  const boundary = new iam.ManagedPolicy(ctx.stack, "Boundary", {
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ["iam:*"],
        resources: ["*"],
      }),
    ],
  });

  iam.PermissionsBoundary.of(ctx.stack).apply(boundary);
}
```

## Setting the permission boundary for the Debug Stack

To set a permission boundary on all IAM users and roles created in the [Debug Stack](../constructs/DebugStack.md) that SST deploys for the [Live Lambda Dev](../live-lambda-development.md) environment; you can use the `debugApp` callback in your `stacks/index.js`.

```js title="stacks/index.js"
import * as iam from '@aws-cdk/aws-iam';
import * as sst from "@serverless-stack/resources";

export function debugApp(app) {
  // Make sure to create the DebugStack when using the debugApp callback
  const stack = new sst.DebugStack(app, "debug-stack");

  const boundary = new iam.ManagedPolicy(stack, 'Boundary', {
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['iam:*'],
        resources: ['*'],
      }),
    ],
  });

  iam.PermissionsBoundary.of(stack).apply(boundary);
}
```

:::note
If you are using the `debugApp` callback, you'll need to make sure to create the `DebugStack` in it.
:::
