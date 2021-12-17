---
title: Testing 🟢
description: "Configuring tests in Serverless Stack (SST)"
---

## Testing your app

You can run your tests using.

```bash
# With npm
npm test
# Or with Yarn
yarn test
```

This runs the tests for your infrastructure (CDK) and application (Lambda). Internally, SST uses [Jest](https://jestjs.io/). You'll just need to add your tests to the `test/` directory.

## Configuring Jest

The default configuration that SST uses for Jest can be overridden by adding any of the following supported keys to a [Jest config](https://jestjs.io/docs/configuration) in your `package.json`.

Supported overrides include:

- `clearMocks`
- `collectCoverageFrom`
- `coveragePathIgnorePatterns`
- `coverageReporters`
- `coverageThreshold`
- `displayName`
- `extraGlobals`
- `globalSetup`
- `globalTeardown`
- `moduleNameMapper`
- `resetMocks`
- `resetModules`
- `restoreMocks`
- `snapshotSerializers`
- `testMatch`
- `transform`
- `transformIgnorePatterns`
- `watchPathIgnorePatterns`

For example.

```json {3}
{
  "jest": {
    "resetMocks": true
  }
}
```

## Integration tests 🟢

When running integraion tests, you often need to test against the deployed resources. You can have SST print out the relevant resource property like API endpoint and DynamoDB table name to a JSON file. To do this, first add the resource property as stack outputs:

```js
const api = new Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});

this.addOutputs({
  ApiUrl: api.url,
});
```

Then when you deploy your app, use the [`--outputs-file`](https://docs.serverless-stack.com/packages/cli#deploy-stack) option to write the AWS CloudFormation stack outputs to a JSON file.

```bash
npx sst deploy --outputs-file outputs.json
// or
yarn deploy --outputs-file outputs.json
```

You can now parse the JSON file to get the value for `ApiUrl` and use it in your integration test.
