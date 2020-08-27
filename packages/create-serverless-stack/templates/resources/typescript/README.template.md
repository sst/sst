# Getting Started with Serverless Stack Toolkit

This project was bootstrapped with [Create Serverless Stack](https://github.com/serverless-stack/serverless-stack/tree/master/packages/create-serverless-stack).

Start by installing the dependencies.

```bash
$ %package-manager% install
```

## Commands

### `%package-manager% run build`

Build your app and synthesize your stacks.

Generates a `build/` directory with the compiled files and a `build/cdk.out/` directory with the synthesized CloudFormation stacks.

### `%package-manager% run deploy [stack]`

Deploy all your stacks to AWS. Or optionally deploy a specific stack.

### `%package-manager% run remove [stack]`

Remove all your stacks and all of their resources from AWS. Or optionally remove a specific stack.

### `%package-manager% test`

Runs your tests using Jest. Takes all the [Jest CLI options](https://jestjs.io/docs/en/cli).

## Documentation

Learn more about the Serverless Stack Toolkit.

- [README](https://github.com/serverless-stack/serverless-stack)
- [@serverless-stack/cli](https://github.com/serverless-stack/serverless-stack/tree/master/packages/cli)
- [@serverless-stack/resources](https://github.com/serverless-stack/serverless-stack/tree/master/packages/resources)

## Community

[Follow us on Twitter](https://twitter.com/ServerlessStack), [join our chatroom](https://gitter.im/serverless-stack/Lobby), or [post on our forums](https://discourse.serverless-stack.com).
