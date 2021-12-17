---
title: Removal Policy 🟢
description: "Setting removal policy for resources in your SST app"
---

The removal policy controls what happens to the resource when it is being removed. This can happen in one of three situations:

- The resource is removed from the Stack;
- A change to the resource is made that requires it to be replaced;
- The stack is deleted, so all resources in it are removed.

## Retained resources

Most of the resources are destroyed on remove, but some stateful resources that contain data are retained. Some commonly used resources that are retained by default:
- S3 buckets
- DynamoDB tables
- CloudWatch log groups

This default behavior is good for the production environment, so you can recover the data when resources are accidentally removed. However, for ephemeral (dev or feature branch) environments, it can be useful to destroy all the resources on deletion.

:::danger
Make sure to not set the default removal policy to `DESTROY` for production environments.
:::

## Changing the removal policy

To set removal policy on all resources in your SST app:

```js title="stacks/index.js"
import { RemovalPolicy } from "@aws-cdk/core";

export default function main(app) {
  // Remove all resources when non-prod stages are removed
  if (app.stage !== "prod") {
    app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);
  }

  // Add stacks
}
```
