---
title: Testing
description: "Learn how to configure tests in SST (SST)."
---

## Testing your app

If you created your app with `create-sst` a [vitest](https://vitest.dev/config/) config was setup for you. You can run tests using

```bash
# With npm
npm test
# Or with Yarn
yarn test
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
