---
title: Permission Boundary
description: "Learn how to set a permission boundary for the IAM users and roles in your Serverless Stack (SST) app."
---

A Permission Boundary is a way to define the maximum scope of permissions a user or role can have. It limits the user or role's permissions but does not specify the actual permissions.

## Setting the permission boundary

To set a permission boundary on all IAM users and roles created in your [`Stack`](../constructs/Stack.md) instances, you can do the following.

```js title="stacks/MyStack.js"
import * as iam from '@aws-cdk/aws-iam';

class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const boundary = new iam.ManagedPolicy(this, "Boundary", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["iam:*"],
          resources: ["*"],
        }),
      ],
    });

    iam.PermissionsBoundary.of(this).apply(boundary);
  }
}
```

## Setting the permission boundary for the debug stack

To set a permission boundary on all IAM users and roles created in the debug stack that SST deploys for the [Live Lambda Dev](../live-lambda-development.md) environment; you can use the `debugStack` callback in your `stacks/index.js`.

```js title="stacks/index.js"
import * as iam from '@aws-cdk/aws-iam';

export function debugStack(app, stack, props) {
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
