---
title: Permission Boundary 🟢
description: "Setting permission boundary for IAM users and roles in your SST app"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

Permission Boundary is a way to define the maximum permissions a user or role can have. It limits the user or role's permissions but does not provide permissions on its own.

## Setting the permission boundary

To set permission boundary on all IAM users and roles created in your Stack instances.

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

To set permission boundary on all IAM users and roles created in your app's debug stack.

```js title="stacks/index.js"
import * as iam from '@aws-cdk/aws-iam';

export function debugStack(
  app: cdk.App,
  stack: cdk.Stack,
  props: sst.DebugStackProps
): void {
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

