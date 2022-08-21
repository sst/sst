---
title: Testing
description: "Learn how to configure tests in SST."
---

## Testing your app

If you created your app with `create-sst` a [vitest](https://vitest.dev/config/) config was setup for you. You can run tests using

```bash
# With npm
npm test
# Or with Yarn
yarn test
```

### How it works

Behind the scene, a `test` script is configured in your `package.json`.

```json
  "scripts": {
    // ...
    "test": "sst load-config -- vitest run"
  }, 
```

The `sst load-config` command fetches all the [`Config.Parameter`](constructs/Parameter.md) and [`Config.Secret`](constructs/Secret.md) used in your app, and invokes the `vitest run` with the config values configured as environment variables. This allows the [`@serverless-stack/node/config`](packages/node.md#config) helper library to work as if the code were running inside Lambda. Read more about [Config](../environment-variables.md).

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

### Upgrading to v1.9.0

The `sst load-config` command was added in the [`v1.9.0 release`](https://github.com/serverless-stack/sst/releases/tag/v1.9.0). If your app was created prior to that, the `test` script was likely configured as `vitest run`. To use `sst load-config`, change it to:

```diff
  "scripts": {
    // ...
-   "test": "vitest run"
+   "test": "sst load-config -- vitest run"
  }, 
```

## Integration tests

When running integration tests, you often need to test against the deployed resources. You can have SST print out the relevant resource properties, like API endpoints and DynamoDB table names to a JSON file.

To do this, first add them as stack outputs:

```js {7-9}
const api = new Api(stack, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

stack.addOutputs({
  ApiUrl: api.url,
});
```

Then when you deploy your app, use the [`--outputs-file`](../packages/cli.md#deploy-stack) option to write these stack outputs to a JSON file.

```bash
npx sst deploy --outputs-file outputs.json
// or
yarn deploy --outputs-file outputs.json
```

You can now parse the JSON file to get the value of the `ApiUrl` and use it in your integration tests.

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
