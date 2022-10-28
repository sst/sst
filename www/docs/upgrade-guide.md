---
title: Upgrade Guide
description: "Upgrade guide for SST"
---

## Upgrade to v1.16

#### Constructs
- **Construct IDs need to be unique** and match the pattern `[a-zA-Z]([a-zA-Z0-9_])+`. If you have constructs with clashing IDs, change to a unique ID. And pass the old ID into `cdk.id` to ensure CloudFormation does not recreate the resource.

  For example, if you have two buckets with the same id.

  ```ts
  // Change
  new Bucket(this, "bucket");
  new Bucket(this, "bucket");

  // To
  new Bucket(this, "usersFiles", {
    cdk: { id: "bucket" }
  });
  new Bucket(this, "adminFiles", {
    cdk: { id: "bucket" }
  });
  ```

- Function/Job: **Pass Secrets and Parameters into `bind`** instead of `config`. The `config` option will be removed in SST v2.
  ```ts
  // Change
  new Function(stack, "myFn", {
    config: [MY_STRIPE_KEY],
  });

  new Job(stack, "myJob", {
    config: [MY_STRIPE_KEY],
  });

  // To
  new Function(stack, "myFn", {
    bind: [MY_STRIPE_KEY],
  });

  new Job(stack, "myJob", {
    bind: [MY_STRIPE_KEY],
  });
  ```

- Function/Job: **Pass SST Constructs into `bind`** instead of `permissions` to grant permissions. `permissions` will not accept SST Constructs in SST v2.
  ```ts
  // Change
  new Function(stack, "myFn", {
    permissions: [myTopic],
  });

  new Job(stack, "myJob", {
    permissions: [myTopic],
  });

  // To
  new Function(stack, "myFn", {
    bind: [myTopic],
  });

  new Job(stack, "myJob", {
    bind: [myTopic],
  });
  ```

- App/Stack: **Pass Secrets and Parameters into `addDefaultFunctionBinding`** instead of `addDefaultFunctionConfig`. `addDefaultFunctionConfig` will be removed in SST v2
  ```ts
  // Change
  app.addDefaultFunctionConfig([MY_STRIPE_KEY]);
  stack.addDefaultFunctionConfig([MY_STRIPE_KEY]);

  // To
  app.addDefaultFunctionBinding([MY_STRIPE_KEY]);
  stack.addDefaultFunctionBinding([MY_STRIPE_KEY]);
  ```

- App/Stack: **Pass SST Constructs into `addDefaultFunctionBinding`** instead of `addDefaultFunctionPermissions` to grant permissions. `addDefaultFunctionPermissions` will not accept SST Constructs in SST v2.
  ```ts
  // Change
  app.addDefaultFunctionPermissions([myTopic]);
  stack.addDefaultFunctionPermissions([myTopic]);

  // To
  app.addDefaultFunctionBinding([myTopic]);
  stack.addDefaultFunctionBinding([myTopic]);
  ```

#### CLI
- **The `sst load-config` command is being renamed to `sst bind`** and will be removed in SST v2
  ```bash
  # Change
  sst load-config -- vitest run

  # To
  sst bind -- vitest run
  ```

#### Client
- **Change `Job.run("myJob")` to `Job.myJob.run()`** in your functions code.
  ```ts
  // Change
  Job.run("myJob", {
    payload
  })

  // To
  Job.myJob.run({
    payload
  })
  ```

---

## Upgrade to v1.10

#### Constructs
- The old `Auth` construct has been renamed to `Cognito` construct.
  ```ts
  // Change
  new Auth(stack, "auth", {
    login: ["email"]
  });

  // To
  new Cognito(stack, "auth", {
    login: ["email"]
  });
  ```

---

## Upgrade to v1.3

#### Constructs
- Auth: `attachPermissionsForAuthUsers()` and `attachPermissionsForUnauthUsers()` now take a scope as the first argument.
  ```ts
  // Change
  const auth = new Auth(stack, "auth", {
    login: ["email"]
  });
  auth.attachPermissionsForAuthUsers(["s3", "sns"]);
  auth.attachPermissionsForUnauthUsers(["s3"]);

  // To
  const auth = new Auth(stack, "auth", {
    login: ["email"]
  });
  auth.attachPermissionsForAuthUsers(auth, ["s3", "sns"]);
  auth.attachPermissionsForUnauthUsers([auth, "s3"]);
  ```

---

## Migrate to v1.0
[View full migration guide](./constructs/v0/migration.md)