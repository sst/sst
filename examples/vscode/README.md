# How to use SST with Visual Studio Code

An example serverless app created with SST.

## Getting Started

[**Read the tutorial**](https://serverless-stack.com/examples/how-to-debug-lambda-functions-with-visual-studio-code.html)

Install the example.

```bash
$ npm init serverless-stack --example vscode
# Or with Yarn
$ yarn create serverless-stack --example vscode
```

## Launch Configurations

The `.vscode/launch.json` contains two launch configurations.

### Debug SST Start

This runs the `sst start` command in debug mode. Allowing you to set breakpoints to your Lambda functions.

### Debug SST Tests

This runs the `sst test` command in debug mode. Allowing you to set breakpoints in your CDK tests.

## Documentation

Learn more about the SST.

- [Docs](https://docs.serverless-stack.com/)
- [@serverless-stack/cli](https://docs.serverless-stack.com/packages/cli)
- [@serverless-stack/resources](https://docs.serverless-stack.com/packages/resources)
