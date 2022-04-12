### Bundling Node.js Functions

#### Disabling bundling

```js
new Function(stack, "MySnsLambda", {
  bundle: false,
  srcPath: "src/",
  handler: "sns/index.main",
});
```

In this case, SST will zip the entire `src/` directory for the Lambda function.

#### Configure bundling

```js
new Function(stack, "MySnsLambda", {
  bundle: {
    externalModules: ["fsevents"],
    nodeModules: ["uuid"],
    format: "esm",
    loader: {
      ".png": "dataurl",
    },
    copyFiles: [{ from: "public", to: "." }],
    commandHooks: {
      beforeBundling: (inputDir, outputDir) => {
        return [ "echo beforeBundling" ];
      },
      beforeInstall: (inputDir, outputDir) => {
        return [ "echo beforeInstall" ];
      },
      afterBundling: (inputDir, outputDir) => {
        return [ "echo afterBundling" ];
      },
    },
  },
  handler: "src/sns/index.main",
});
```

#### Configure esbuild plugins

To use an [esbuild plugin](https://esbuild.github.io/plugins/), install the plugin npm package in your project. Then create a config file that exports the plugin.

```js title="config/esbuild.js"
const { esbuildDecorators } = require("@anatine/esbuild-decorators");

module.exports = [
  esbuildDecorators(),
];
```

You can now reference the config file in your functions.

```js title="stacks/MyStack.js" {3}
new Function(stack, "MySnsLambda", {
  bundle: {
    esbuildConfig: {
      plugins: "config/esbuild.js",
    },
  },
  handler: "src/sns/index.main",
});
```

### Bundling Python Functions

```js
new Function(stack, "MySnsLambda", {
  bundle: {
    installCommands: [
      "pip install --index-url https://domain.com/pypi/myprivatemodule/simple/ --extra-index-url https://pypi.org/simple"
    ],
  },
  srcPath: "src",
  handler: "index.main",
  runtime: "python3.7",
});
```

### Setting additional props

Use the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionOptions.html) to set additional props.

```js
new Function(stack, "MyApiLambda", {
  handler: "src/api.main",
  timeout: 10,
  environment: {
    TABLE_NAME: "notes",
  },
});
```

### Setting default props

If you have properties that need to be applied to all the functions in your app, they can be set on the App construct using the `setDefaultFunctionProps` method.

```js
app.setDefaultFunctionProps({
  timeout: 20,
  memorySize: 512,
});
```

Similarly, you can apply properties to all the functions in a specific Stack.

```js
stack.setDefaultFunctionProps({
  timeout: 20,
  memorySize: 512,
});
```

### Using SSM values as environment variables

```js
import { StringParameter } from "aws-cdk-lib/aws-ssm";

const apiKey = StringParameter.valueFromLookup(this, "my_api_key");

new Function(stack, "MyApiLambda", {
  handler: "src/api.main",
  environment: {
    API_KEY: apiKey,
  },
});
```

The `API_KEY` environment variable can be accessed as `process.env.API_KEY` within the Lambda function.

### Using IS_LOCAL environment variable

```js
export async function main(event) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Are we running locally: ${!!process.env.IS_LOCAL}`,
  };
}
```

### Advanced examples

#### Configuring a Dead Letter Queue

```js {5}
const queue = new Queue(this, "MyDLQ");

new Function(stack, "MyApiLambda", {
  handler: "src/api.main",
  deadLetterQueue: queue.cdk.queue,
});
```

#### Configuring Provisioned Concurrency

```js {3-5,8}
const fn = new Function(stack, "MyApiLambda", {
  handler: "src/api.main",
  currentVersionOptions: {
    provisionedConcurrentExecutions: 5,
  },
});

const version = fn.currentVersion;
```

Note that Provisioned Concurrency needs to be configured on a specific Function version. By default, versioning is not enabled, and setting `currentVersionOptions` has no effect. By accessing the `currentVersion` property, a version is automatically created with the provided options. 
