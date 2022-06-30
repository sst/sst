### Setting additional props

Use the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionOptions.html) to set additional props.

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
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

new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
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

### Configuring Node.js runtime

#### handler

The `handler` property points to the path of the entry point and handler function. Uses the format, `/path/to/file.function`. Where the first part is the path to the file, followed by the name of the function that's exported in that file.

For example, if your handler file is in `src/lambda.ts` and it exported a function called `main`. The handler would be `src/lambda.main`.

SST checks for a file with a `.ts`, `.tsx`, `.js`, or `.jsx` extension.

If the `srcPath` is set, then the path to the `handler` is relative to it. So if the `srcPath` is set to `src`. Then `lambda.main` as the `handler` would mean that the file is in src/lambda.js (or the other extensions).

#### srcPath

The directory that needs to zipped up as the Lambda function package. Only applicable if the [`bundle`](#bundle) option is set to `false`.

Note that for TypeScript functions, if the `srcPath` is not the project root, SST expects the `tsconfig.json` to be in this directory.

#### bundle

Bundles your Lambda functions with [esbuild](https://esbuild.github.io). Turn this off if you have npm packages that cannot be bundled. Currently bundle cannot be disabled if the `srcPath` is set to the project root. [Read more about this here](https://github.com/serverless-stack/sst/issues/78).

If you want to configure the bundling process, you can pass in the [FunctionBundleNodejsProps](#functionbundlenodejsprops).

#### Disabling bundling

```js
new Function(stack, "MyLambda", {
  bundle: false,
  srcPath: "src",
  handler: "lambda.main",
});
```

In this case, SST will zip the entire `src/` directory for the Lambda function.

#### Configure bundling

```js
new Function(stack, "MyLambda", {
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
  handler: "src/lambda.main",
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
new Function(stack, "MyLambda", {
  bundle: {
    esbuildConfig: {
      plugins: "config/esbuild.js",
    },
  },
  handler: "src/lambda.main",
});
```

### Configuring Python runtime

#### handler

Path to the entry point and handler function relative to the `srcPath`. Uses the format, `path/to/file.function`. Where the first part is the path to the file, followed by the name of the function that's exported in that file.

For example, if your `srcPath` is `src/`, your handler file is in `src/lambda.py`, and it exported a function called `main`. The handler would be `lambda.main`.

#### srcPath

For Python functions, `srcPath` is required. This is the directory where the `requirements.txt`, `Pipfile`, or `poetry.lock` is expected.

```js
new Function(stack, "MyLambda", {
  bundle: {
    installCommands: [
      "pip install --index-url https://domain.com/pypi/myprivatemodule/simple/ --extra-index-url https://pypi.org/simple -r requirements.txt ."
    ],
  },
  srcPath: "src",
  handler: "index.main",
  runtime: "python3.7",
});
```

#### bundle

For Python functions, a dependency manager is used to install the packages. The dependency manager is selected based on which of the following files are found in the `srcPath`: 

| File | Steps |
|------|-------|
| `requirements.txt` | [pip](https://packaging.python.org/key_projects/#pip) is used to run `pip install` |
| `Pipfile` | [Pipenv](https://packaging.python.org/key_projects/#pipenv) is used to generate a `requirements.txt` and then `pip install` is run |
| `poetry.lock` | [poetry](https://packaging.python.org/key_projects/#poetry) is used to generate a `requirements.txt` and then `pip install` is run |

You can override this behavior by passing in the `installCommands` through the [FunctionBundlePythonProps](#functionbundlepythonprops).

Note that for Python functions, you'll need to have Docker installed. When building and deploying, this construct will handle installing all the required modules in a [Lambda compatible Docker container](https://github.com/aws/aws-sam-build-images/tree/develop/build-image-src), based on the runtime. This ensures that the Python Lambda functions are compiled correctly.

### Configuring Go runtime

#### handler

Path to the handler function. Uses the format, `/path/to/file.go` or just `/path/to`.

If the `srcPath` is set, then the path to the `handler` is relative to it. So if the `srcPath` is set to `src`. Then `lambda.go` as the `handler` would mean that the file is in `src/lambda.go`.

#### srcPath

The directory where `go.mod` is found.

#### bundle

Only supported for the **Node.js** and **Python** runtimes.

### Configuring C#(.NET) runtime

#### handler

Path to the handler function. Uses the format, `ASSEMBLY::TYPE::METHOD`.

- `ASSEMBLY` is the name of the .NET assembly file. If you haven't set the assembly name using the `AssemblyName` property in `.csproj`, the `ASSEMBLY` name will be the `.csproj` file name.
- `TYPE` is the full name of the handler type. Consists of the `Namespace` and the `ClassName`.
- `METHOD` is the name of the function handler.

Consider a project with `MyApp.csproj` and the following handler function:

```csharp
namespace Example
{            
  public class Hello
  {
    public Stream MyHandler(Stream stream)
    {
       //function logic
    }
  }
}
```

The handler would be, `MyApp::Example.Hello::MyHandler`.

#### srcPath

The directory where `.csproj` is found.

#### bundle

Only supported for the **Node.js** and **Python** runtimes.

### Configuring F#(.NET) runtime

#### handler

The handler function. Uses the format, `ASSEMBLY::TYPE::METHOD`.

- `ASSEMBLY` is the name of the .NET assembly file. If you haven't set the assembly name using the AssemblyName property in .fsproj, the `ASSEMBLY` name will be the .fsproj file name.
- `TYPE` is the full name of the handler type, which consists of the `Namespace` and the `ClassName`.
- `METHOD` is the name of the function handler.

Consider a project with `MyApp.fsproj` and the following handler function:
```csharp
namespace Example

module Hello =

  let Handler(request:APIGatewayHttpApiV2ProxyRequest) =
     //function logic
```
The handler would be: `MyApp::Example.Hello::MyHandler`.

#### srcPath

The directory where `.fsproj` is found.

#### bundle

Only supported for the **Node.js** and **Python** runtimes.

### Function URLs

#### Using the basic config

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  url: true,
});
```

#### Authorization

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  url: {
    authorizer: "iam"
  },
});
```

#### Disabling CORS

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  url: {
    cors: false,
  },
});
```

#### Configuring CORS

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  url: {
    cors: {
      allowMethods: ["GET", "POST"],
      allowOrigins: ["https://domain.com"],
    }
  },
});
```

### Advanced examples

#### Configuring a Dead Letter Queue

```js {5}
const queue = new Queue(this, "MyDLQ");

new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  deadLetterQueue: queue.cdk.queue,
});
```

#### Configuring Provisioned Concurrency

```js {3-5,8}
const fn = new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  currentVersionOptions: {
    provisionedConcurrentExecutions: 5,
  },
});

const version = fn.currentVersion;
```

Note that Provisioned Concurrency needs to be configured on a specific Function version. By default, versioning is not enabled, and setting `currentVersionOptions` has no effect. By accessing the `currentVersion` property, a version is automatically created with the provided options. 

#### Configuring VPC

```js
import * as ec2 from "aws-cdk-lib/aws-ec2";

// Create a VPC
const vpc = new ec2.Vpc(this, 'MyVPC');

// Alternatively use an existing VPC
const vpc = ec2.Vpc.fromLookup(stack, 'VPC', { ... });

new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
  }
});
```

If you need access to resources within a VPC, then run your AWS Lambda function within a VPC. If you do not require this access, then do not run it within a VPC.

Read more about [working with VPC](https://docs.sst.dev/live-lambda-development#working-with-a-vpc).
