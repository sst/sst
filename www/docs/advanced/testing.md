---
title: Testing
description: "Learn how to configure tests in SST."
---

## Overview

There are 3 types of tests you can write for your SST apps:
1. Tests for your domain functions
2. Tests for your APIs
3. Tests for your stacks

In this chapter, we will create a new app using the GraphQL stack template. And we'll look at how to write each type of tests.

:::tip
To follow along, you can create the GraphQL stack by running `npx create-sst@latest`, select `graphql` project, and then select `DynamoDB` database.

Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/create-sst-dynamo) based on the same template.
:::

### Setting up tests

If you created your app with `create-sst` a [vitest](https://vitest.dev/config/) config was setup for you. And a test script was added in your `package.json`:

  ```json {8}
  "scripts": {
    "start": "sst start",
    "build": "sst build",
    "deploy": "sst deploy",
    "remove": "sst remove",
    "console": "sst console",
    "typecheck": "tsc --noEmit",
    "test": "sst load-config -- vitest run"
  }, 
  ```

:::note
If you created your app using `create-sst` prior to v1.9.0, make sure to prepend `sst load-config --` to your test script.
:::

And you can run tests using

  ```bash
  # With npm
  npm test
  # Or with Yarn
  yarn test
  ```

## Testing domain functions

If you are new to the GraphQL stack template, it creates a very simple Reddit clone. You can submit links and it'll display all the links that have been submitted.

Open up `services/core/article.ts`, it comtains a `create()` function to create an article, and a `list()` function to list all submitted articles. Because this file contains all the logic for the `article` domain, we are calling these functions "domain functions". Learn more about [domain driven design](https://www.youtube.com/watch?v=MC_dS5G1jqw).

Let's write a test for our `article` domain functions.

Create a new file at `services/test/core/article.test.ts`:

```ts
import { expect, it } from "vitest";
import { Article } from "@my-sst-app/core/article";

it("create an article", async () => {
  // Create a new article
  const article = await Article.create("Hello world", "https://example.com");

  // List all articles
  const list = await Article.list();

  // Check the newly created article exists
  expect(
    list.find((a) => a.articleID === article.articleID)
  ).not.toBeNull();
});
```

Both the `create()` and `list()` functions call `services/core/dynamo.ts` to talk to the database. And `services/core/dynamo.ts` references `Config.TABLE_NAME`. The above test only works if we ran `sst load-config -- vitest run`. `load-config` prefetches the value for `TABLE_NAME` and passes it to the test. If we run `vitest run` directly, we will get an error complaining `Config.TABLE_NAME` cannot be resolved. Read more about [how `sst load-config` works](#how-sst-load-config-works).

## Testing APIs

We can rewrite the above test so that instead of calling `Article.create()`, you can make a request to the GraphQL API to create an article. In fact, the GraphQL stack template already included this test. Let's take a look.

First, to call the GraphQL API in our test, we need to know the API's URL. A [`Parameter`](../environment-variables.md#configparameter) was created in `stacks/Api.ts`:

```ts
  new Config.Parameter(stack, "API_URL", {
    value: api.url,
  });
```

Open `services/test/graphql/article.test.ts`, you can see the test is similar to our domain function test above.

```ts
import { Config } from "@serverless-stack/node/config";
import { expect, it } from "vitest";
import { createClient } from "@my-sst-app/graphql/genql";
import { Article } from "@my-sst-app/core/article";

it("create an article", async () => {
  const client = createClient({
    url: Config.API_URL + "/graphql",
  });

  // Call the API to create a new article
  const article = await client.mutation({
    createArticle: [
      { title: "Hello world", url: "https://example.com" },
      {
        id: true,
      },
    ],
  });

  // List all articles
  const list = await Article.list();

  // Check the newly created article exists
  expect(
    list.find((a) => a.articleID === article.createArticle.id)
  ).not.toBeNull();
});
```

The above test only works if we ran `sst load-config -- vitest run`. `load-config` prefetches the value for `API_URL` and passes it to the test. If we run `vitest run` directly, we will get an error complaining `Config.API_URL` cannot be resolved. Read more about [how `sst load-config` works](#how-sst-load-config-works).

Note that this test is very similar to the request frontend makes when a user trys to submit a link.

:::tip
API tests are often more useful than domain function tests because they test the app from a user's perspective, ignoring changes in the implementation details.
:::


## Testing stacks

Both domain function tests and API tests are for testing your business logic code. Stack tests on the other hand allows you to test your infrastructure settings:
- Is the database backup enabled?
- Are the functions running with at least 1024MB of memory?
- Did I accidentally change the database name, and the data will be wiped out on deploy?

Let's write a test for our `Database` stack to ensure point-in-time recovery is enabled for our DynamoDB table.

Create a new file at `stacks/test/Database.test.ts`:

```ts
import { Template } from "aws-cdk-lib/assertions";
import { it } from "vitest";
import { App, getStack } from "@serverless-stack/resources";
import { Database } from "../Database";

it("point-in-time recovery is enabled", async () => {
  // Create the Database stack
  const app = new App();
  app.stack(Database);

  // Get the CloudFormation template of the stack
  const stack = getStack(Database);
  const template = Template.fromStack(stack);

  // Check point-in-time recovery is enabled
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
    },
  });
});
```

`aws-cdk-lib/assertions` is a CDK helper library that makes it easy to test against AWS resources created inside a stack. In the test above, we are checking if there is a DynamoDB table created with `PointInTimeRecoveryEnabled` set to `true`. Read more about [assertions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html).

To write stack tests, you need to know the CloudFormation resource definition of the resource you are testing against. Here is a [handy reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) where you can look that up.

## Tips

### Do not test implementation details

In this chapter, we used DynamoDB as our database choice. We could've selected PostgreSQL and our tests would've remained the same.

Your tests should be unaware of things like what table data is being written to and instead just call domain functions to verify input / output. This will minimize how often you need to rewrite your tests as implementation details change but still ensure the system is working as intended.

### Running tests in parallel

Tests need to be structured in a way they can be run reliably in parallel. In our domain function and API tests above, we checked to see if the created article exists:

```ts
  // Check the newly created article exists
  expect(
    list.find((a) => a.articleID === article.createArticle.id)
  ).not.toBeNull();
```

Instead, if we checked for the total article count, the test might fail depending on if other tests also created articles.

```ts
  expect(list.length).toBe(1);
```

The best way to isolate tests is to create seperate scopes for each test. In our example, the articles are stored globally. If the articles were stored within a user's scope, you can create a new user per test. This way tests can run in parallel without conflicting each other.

## How `sst load-config` works

When testing your code, you have to ensure the testing environment has the same environment variable values as the Lambda environment. Previously, people used to manually maintain a `.env.test` file with environment values. SST has built-in support for automatically loading secrets and environment values managed by [`Config`](../environment-variables.md).

Behind the scene, the `sst load-config` command fetches all the Config values, [`Parameter`](constructs/Parameter.md) and [`Secret`](constructs/Secret.md), used in your app, and invokes the `vitest run` with the values configured as environment variables. This allows the [`@serverless-stack/node/config`](packages/node.md#config) helper library to work as if the code were running inside Lambda. Read more about [Config](../environment-variables.md).

The following environment variables are set.
- `SST_APP` with the name of your SST app
- `SST_STAGE` with the stage
- For Secrets, `load-config` fetches and decrypts all SSM Parameters prefixed with `/sst/{appName}/{stageName}/secrets/*` and `/sst/{appName}/.fallback/secrets/*`, and sets corresponding environment variables `SST_PARAM_*`.

  ie. `SST_PARAM_STRIPE_KEY` is created with value from `/sst/{appName}/{stageName}/secrets/STRIPE_KEY`
- For Parameters, `load-config` fetches all SSM Parameters prefixed with `/sst/{appName}/{stageName}/parameters/*`, and sets corresponding environment variables `SST_PARAM_*`.

  ie. `SST_PARAM_USER_UPDATED_TOPIC` is created with value from `/sst/{appName}/{stageName}/parameters/USER_UPDATED_TOPIC`

  :::note
  Secret values ie. `/sst/{appName}/{stageName}/secrets/STRIPE_KEY` are stored as Parameter environment variables `SST_PARAM_STRIPE_KEY`. This is intentional so the [`@serverless-stack/node/config`](packages/node.md#config) helper library doesn't need to re-fetch the secret values at runtime.
  :::