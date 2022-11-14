---
title: Upgrade Guide
description: "Upgrade guide for all notable SST releases."
---

import config from "../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Upgrade guide for all notable SST releases.

</HeadlineText>

To view the latest release and all historical releases, <a href={`${config.github}/releases`}>head over to our GitHub release page</a>.

---

## Upgrade to v1.18

#### Constructs

- Api: The `pothos` route type is renamed to `graphql`, and will be removed in SST v2.

  ```diff
  new Api(stack, "api", {
    routes: {
      "POST /graphql": {
  -     type: "pothos",
  +     type: "graphql",
        function: handler: "functions/graphql/graphql.ts",
  -     schema: "backend/functions/graphql/schema.ts",
  -     output: "graphql/schema.graphql",
  -     commands: [
  -       "./genql graphql/graphql.schema graphql/
  -     ]
  +     pothos: {
  +       schema: "backend/functions/graphql/schema.ts",
  +       output: "graphql/schema.graphql",
  +       commands: [
  +         "./genql graphql/graphql.schema graphql/
  +       ]
  +     }
      }
    }
  });
  ```

- GraphQLApi: The `GraphQLApi` construct is deprecated, and will be removed in SST v2. Use the `Api` construct with a `graphql` route instead.

  ```diff
  - new GraphQLApi(stack, "api", {
  -   server: "src/graphql.handler",
  -   codegen: "./graphql/codegen.yml"
  - });

  + new Api(stack, "api", {
  +   routes: {
  +     "POST /": {
  +       type: "graphql",
  +       function: "src/graphql.handler",
  +       codegen: "./graphql/codegen.yml"
  +     }
  +   }
  + });
  ```

---

## Upgrade to v1.16

[Resource Binding](resource-binding.md) was introduced in this release. It simplies accessing the resources in your app. For example, here's how we bind the bucket to the function:

```diff
const bucket = new Bucket(stack, "myFiles");

new Function(stack, "myFunction", {
  handler: "lambda.handler",
- environment: {
-   BUCKET_NAME: bucket.bucketName,
- },
- permissions: [bucket],
+ bind: [bucket],
});
```

And here's how we access it in our function.

```diff
+ import { Bucket } from "@serverless-stack/node/bucket";

- process.env.BUCKET_NAME
+ Bucket.myFiles.bucketName
```

Following are the steps to upgrade.

1. **CLI**

   1. The path for the SSM parameters that stores the secrets has changed. So you'll **need to run `sst deploy` or `sst start`** before using the [`sst secrets`](packages/cli.md#secrets-action) CLI.

   2. **The `sst load-config` command is being renamed to `sst bind`** and will be removed in SST v2

      ```diff
      - sst load-config -- vitest run
      + sst bind -- vitest run
      ```

2. **Constructs**

   1. **Construct IDs need to be unique** and match the pattern `[a-zA-Z]([a-zA-Z0-9-_])+`. If you have constructs with clashing IDs, change to a unique ID. And pass the old ID into `cdk.id` to ensure CloudFormation does not recreate the resource.

      For example, if you have two buckets with the same id.

      ```diff
      - new Bucket(stack), "bucket");
      - new Bucket(stack), "bucket");

      + new Bucket(stack), "usersFiles", {
      +   cdk: { id: "bucket" },
      + });
      + new Bucket(stack), "adminFiles", {
      +   cdk: { id: "bucket" },
      + });
      ```

   2. Function/Job: **Pass Secrets and Parameters into `bind`** instead of `config`. The `config` option will be removed in SST v2.

      ```diff
      new Function(stack, "myFn", {
      - config: [MY_STRIPE_KEY],
      + bind: [MY_STRIPE_KEY],
      });

      new Job(stack, "myJob", {
      - config: [MY_STRIPE_KEY],
      + bind: [MY_STRIPE_KEY],
      });
      ```

   3. Function/Job: **Pass SST Constructs into `bind`** instead of `permissions` to grant permissions. `permissions` will not accept SST Constructs in SST v2.

      ```diff
      new Function(stack, "myFn", {
      - permissions: [myTopic],
      + bind: [myTopic],
      });

      new Job(stack, "myJob", {
      - permissions: [myTopic],
      + bind: [myTopic],
      });
      ```

   4. App/Stack: **Pass Secrets and Parameters into `addDefaultFunctionBinding`** instead of `addDefaultFunctionConfig`. `addDefaultFunctionConfig` will be removed in SST v2

      ```diff
      - app.addDefaultFunctionConfig([MY_STRIPE_KEY]);
      + app.addDefaultFunctionBinding([MY_STRIPE_KEY]);

      - stack.addDefaultFunctionConfig([MY_STRIPE_KEY]);
      + stack.addDefaultFunctionBinding([MY_STRIPE_KEY]);
      ```

   5. App/Stack: **Pass SST Constructs into `addDefaultFunctionBinding`** instead of `addDefaultFunctionPermissions` to grant permissions. `addDefaultFunctionPermissions` will not accept SST Constructs in SST v2.

      ```diff
      - app.addDefaultFunctionPermissions([myTopic]);
      + app.addDefaultFunctionBinding([myTopic]);

      - stack.addDefaultFunctionPermissions([myTopic]);
      + stack.addDefaultFunctionBinding([myTopic]);
      ```

3. **Client**

   1. **Change `Job.run("myJob")` to `Job.myJob.run()`** in your functions code.

      ```diff
      - Job.run("myJob", { payload });
      + Job.myJob.run({ payload });
      ```

---

## Upgrade to v1.10

#### Constructs

- The old `Auth` construct has been renamed to `Cognito` construct.

  ```diff
  - new Auth(stack, "auth", {
  + new Cognito(stack, "auth", {
      login: ["email"],
    });
  ```

---

## Upgrade to v1.3

#### Constructs

- Auth: `attachPermissionsForAuthUsers()` and `attachPermissionsForUnauthUsers()` now take a scope as the first argument.

  ```diff
  const auth = new Auth(stack, "auth", {
    login: ["email"],
  });

  - auth.attachPermissionsForAuthUsers(["s3", "sns"]);
  + auth.attachPermissionsForAuthUsers(auth, ["s3", "sns"]);

  - auth.attachPermissionsForUnauthUsers(["s3"]);
  + auth.attachPermissionsForUnauthUsers([auth, "s3"]);
  ```

---

## Migrate to v1.0

[View the full migration guide](./constructs/v0/migration.md).
