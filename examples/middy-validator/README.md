# How to use Middy to validate your serverless API requests

An example serverless API created with SST and validated using Middy.

## Getting Started

[**Read the tutorial**](https://sst.dev/examples/how-to-use-middy-to-validate-your-serverless-api-requests.html)

Install the example.

```bash
$ npx create-sst@latest --template=examples/middy-validator
# Or with Yarn
$ yarn create sst --template=examples/middy-validator
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
