---
title: Removal Policy
description: "Learn how to set the removal policy for resources in your SST app."
---

A Removal Policy controls what happens to the resource when it's being removed. This can happen in one of three situations:

1. The resource is removed from the Stack.
2. A change to the resource is made that requires it to be replaced.
3. The stack is deleted, so all resources in it are removed.

Let's look at this in a little more detail.

---

## Removing a resource from a stack

If you remove a construct from a stack that was previously deployed, that resource will be removed on the next deploy (or if you are running `sst dev`, it'll automatically deploy the changes).

```diff title="stacks/MyStack.ts"
export function API({ stack }: StackContext) {

- const api = new Api(stack, "api", {
-   routes: {
-     "GET /": "packages/functions/src/lambda.handler",
-   },
- });

  // Other constructs
}
```

This change will remove the API and all its resources.

--

## Removing the resources in a stack

In contrast, simply removing a stack from your list of stacks, does not remove the resources in it.

```diff title="sst.config.ts"
stacks(app) {
  app
-   .stack(API)
    .stack(Web);
},
```

Here the stack is not removed and the resources in it are not either.

:::info
To remove a stack from an app you'll need to use the [`sst remove $STACK_NAME`](../packages/sst.md#sst-remove) with the stack name.
:::

To remove the stack you'll first need to run.

```bash
npx sst remove $STACK_NAME
```

Where `$STACK_NAME` is the name of the stack that needs to be removed.

Now you can go ahead and remove it from your stacks code.


---

## Retained resources

Most of the resources are destroyed on remove, but some stateful resources that contain data are retained by default. These include:

- S3 buckets
- DynamoDB tables
- CloudWatch log groups

This default behavior is good for production environments. It allows you to recover the data when an environment is accidentally removed. However, for ephemeral (dev or feature branch) environments, it can be useful to destroy all the resources on deletion.

---

## Changing the removal policy

You can set the removal policy on all the resources in your SST app.

:::danger
Make sure to not set the default removal policy to `destroy` for production environments.
:::

```ts title="sst.config.ts" {7-9}
export default {
  config(_input) {
    // ...
  },
  stacks(app) {
    // Remove all resources when non-prod stages are removed
    if (app.stage !== "prod") {
      app.setDefaultRemovalPolicy("destroy");
    }

    // ...
  },
} satisfies SSTConfig;
```
