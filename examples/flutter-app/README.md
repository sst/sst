# How to create a Flutter app

An example full-stack serverless Flutter app created with SST.

## Getting Started

[**Read the tutorial**](https://sst.dev/examples/how-to-create-a-flutter-app-with-serverless.html)

Install the example.

```bash
$ npx create-sst@latest --template=examples/flutter-app
# Or with Yarn
$ yarn create sst --template=examples/flutter-app
```

Set the deployed API endpoint in Flutter. Create a `.env` file inside `frontend\` with the following content:

```bash
DEV_API_URL=OUTPUT_FROM_SST_START
PROD_API_URL=OUTPUT_FROM_SST_DEPLOY
```

Replace `OUTPUT_FROM_SST_START` with the deployed API endpoint from running `yarn run start`; and replace `OUTPUT_FROM_SST_DEPLOY` with that from running `yarn sst deploy`.

Install the Flutter app.

```bash
$ cd frontend
$ flutter run
```

## Commands

### `yarn run start`

Starts the local Lambda development environment.

### `yarn run build`

Build your app and synthesize your stacks.

Generates a `.build/` directory with the compiled files and a `.build/cdk.out/` directory with the synthesized CloudFormation stacks.

### `yarn run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy, a specific stack.

### `yarn run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally removes, a specific stack.

### `yarn run test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

## Documentation

Learn more about SST.

- [Docs](https://docs.sst.dev)
- [sst](https://docs.sst.dev/packages/sst)

## Community

[Follow us on Twitter](https://twitter.com/sst_dev) or [post on our forums](https://discourse.sst.dev).
