# How to use SST with Visual Studio Code

An example serverless app created with SST.

## Getting Started

[**Read the tutorial**](https://sst.dev/examples/how-to-debug-lambda-functions-with-visual-studio-code.html)

Install the example.

```bash
$ npx create-sst@latest --template=examples/vscode
# Or with Yarn
$ yarn create sst --template=examples/vscode
# Or with PNPM
$ pnpm create sst --template=examples/vscode
```

## Launch Configurations

The `.vscode/launch.json` contains two launch configurations.

### Debug SST Start

This runs the `sst start` command in debug mode. Allowing you to set breakpoints to your Lambda functions.

### Debug SST Tests

This runs the `sst test` command in debug mode. Allowing you to set breakpoints in your CDK tests.

## Documentation

Learn more about the SST.

- [Docs](https://docs.sst.dev/)
- [sst](https://docs.sst.dev/packages/sst)
