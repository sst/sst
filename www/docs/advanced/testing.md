---
title: Testing
description: "Learn how to configure tests in SST."
---

When testing your code, one of the biggest challenges is ensuring the testing environment has the same environment variable values as the Lambda environment. SST has built-in support for securely loading environment variables and secrets values managed by [`Config`](../environment-variables.md) and using them in your tests.

:::tip
If you created your app with `create-sst` a [vitest](https://vitest.dev/config/) config was setup for you. You can run tests using `vitest run`.
:::

In this chapter we'll look at how they work.

## Unit tests

### Quick start

1. Ensure you are using [`Config`](../environment-variables.md) to manage your environment variables. For example:

  ```ts title="handler.ts"
  import { Config } from "@serverless-stack/node/config";

  export const main = async () => {
    return Config.MY_TABLE_NAME;
  };
  ```

2. Write tests to call the function.

  ```ts title="handler.test.ts"
  import { main } from "./handler.js";

  it("test MY_TABLE_NAME is loaded", async() => {
    expect(await main()).toBe("dev-app-my-table");
  });
  ```

3. Run tests

  ```bash
  $ sst load-config -- vitest run
  ```

4. If you created your app with `create-sst`, `load-config` was already setup for your tests. If not, open up your `package.json`, and append `sst load-config --` to the `test` script.

  ```diff
  "scripts": {
    // ...
    - "test": "vitest run"
    + "test": "sst load-config -- vitest run"
  }, 
  ```

  And you can run tests using

  ```bash
  # With npm
  npm test
  # Or with Yarn
  yarn test
  ```

### How it works

Behind the scene, the `sst load-config` command fetches all the Config values, [`Parameter`](constructs/Parameter.md) and [`Secret`](constructs/Secret.md), used in your app, and invokes the `vitest run` with the values configured as environment variables. This allows the [`@serverless-stack/node/config`](packages/node.md#config) helper library to work as if the code were running inside Lambda. Read more about [Config](../environment-variables.md).

The following environment variables are set.
- `SST_APP` with the name of your SST app
- `SST_STAGE` with the stage
- For Secrets, `load-config` fetches and decryptes all SSM Parameters prefixed with `/aws/{appName}/{stageName}/secrets/*` and `/aws/{appName}/.fallback/secrets/*`, and sets corresponding environment varaibles `SST_PARAM_*`.

  ie. `SST_PARAM_STRIPE_KEY` is creatd with value from `/aws/{appName}/{stageName}/secrets/STRIPE_KEY`
- For Parameters, `load-config` fetches all SSM Parameters prefixed with `/aws/{appName}/{stageName}/parameters/*`, and sets corresponding environment varaibles `SST_PARAM_*`.

  ie. `SST_PARAM_USER_UPDATED_TOPIC` is created with value from `/aws/{appName}/{stageName}/parameters/USER_UPDATED_TOPIC`

  :::note
  Secret values ie. `/aws/{appName}/{stageName}/secrets/STRIPE_KEY` are stored as Parameter environment variables `SST_PARAM_STRIPE_KEY`. This is intentional so the [`@serverless-stack/node/config`](packages/node.md#config) helper library doesn't need to re-fetch the secret values at runtime.
  :::

## Integration tests

Integration tests are often more useful than unit tests because they test the promises the edges of your application makes while the tests remain simple and ignorant of changing implementation details.

The most common edge of your application is your API. Let's look at how to test against the API endpoint.

1. In your stacks code, create a parameter to store the API URL.

  ```ts {7-9}
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "src/lambda.main",
    },
  });

  const API_URL = new Config.Parameter(stack, "API_URL", {
    value: api.url,
  });
  ```

2. In your tests initialize an HTTP client that makes requests to the API URL as though it's a real client.

  ```ts
  import fetch from "node-fetch";
  import { expect, it } from "vitest";
  import { Config } from "@serverless-stack/node/config";

  it("test create an article", async () => {
    const response = await fetch(Config.API_URL);
    const body = await response.text();

    expect(body).toBe("Hello world");
  });
  ```

3. Run tests

  ```bash
  $ sst load-config -- vitest run
  ```

In the case of testing API routes that perform database updates, tests will usually involve triggering an HTTP endpoint and then calling some domain function to test of the expected data has been written.  For example you might call `createArticle` using the API and then do `Article.list()` to see if it was created.

## Stacks tests

If you'd like to test your stack code itself without deploying anything you can do so with [`aws-cdk-lib/assertions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions-readme.html)

Here is an example test

```ts
import { App, getStack } from "@serverless-stack/resources"
import { Template } from "aws-cdk-lib/assertions"

test("queue exists", async () => {
  const app = new App()
  app.stack(MyStack)
  const template = Template.fromStack(getStack(MyStack));
  template.resourceCountIs("AWS::SQS::Queue", 1);
});
```
