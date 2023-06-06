---
title: Removal Policy
description: "Learn how to set the removal policy for resources in your SST app."
---

<!-- @format -->

A Removal Policy controls what happens to the resource when it's being removed. This can happen in one of three situations:

1. The resource is removed from the template, so CloudFormation stops managing it.
2. A change to the resource is made that requires it to be replaced, so CloudFormation stops managing it.
3. The stack is deleted, so CloudFormation stops managing all resources in it.

## Accepted Values

```
"destroy" | "retain" | "snapshot"
```

## Default Value

`"destroy"`

By default all, resources, icluding

-   S3 buckets
-   DynamoDB tables
-   CloudWatch log groups
-   Lambda Functions

are removed from AWS, once you run `sst remove`.

## Retained resources

Most of the resources are destroyed on remove, but some resources that contain data are retained by setting the default removal policy of the `app` to `"retain"`. These include:

-   S3 buckets
-   DynamoDB tables
-   CloudWatch log groups
-   Lambda Functions

This behavior is good for production environments. It allows you to recover the data when an environment is accidentally removed. However, for ephemeral (dev or feature branch) environments, it can be useful to destroy all the resources on deletion.

## Changing the removal policy

You can set the removal policy on all the resources in your SST app.

:::danger
Make sure to change the default removal policy to `retain` for production environments.
:::

```ts title="sst.config.ts" {7-9}
export default {
  config(_input) {
    // ...
  },
  stacks(app) {
    // Don't remove all resources when prod stages are removed
    if (app.stage === "prod") {
      app.setDefaultRemovalPolicy("retain");
    }

    // ...
  },
} satisfies SSTConfig;
```
