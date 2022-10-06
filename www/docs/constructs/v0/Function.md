---
description: "Docs for the sst.Function construct in the @serverless-stack/resources package"
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

import config from "../../../config";

A replacement for the [`cdk.lambda.NodejsFunction`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html) that allows you to [develop your Lambda functions locally](live-lambda-development.md). Supports JS, TypeScript, Python, Golang, and C#. It also applies a couple of defaults:

- Sets the default memory setting to 1024MB.
- Sets the default Lambda function timeout to 10 seconds.
- [Enables AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html) by default so you can trace your serverless applications.
- `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is turned on. Meaning that the Lambda function will automatically reuse TCP connections when working with the AWS SDK. [Read more about this here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html).
- Sets the `IS_LOCAL` environment variable for the Lambda function when it is invoked locally through the `sst start` command.

## Initializer

```ts
new Function(scope: Construct, id: string, props: FunctionProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`FunctionProps`](#functionprops)

## Examples

### Creating a Function

```js
import { Function } from "@serverless-stack/resources";

new Function(this, "MySnsLambda", {
  handler: "src/sns/index.main",
});
```

### Configure Bundling a Node.js Function

#### Disabling bundling

```js
new Function(this, "MySnsLambda", {
  bundle: false,
  srcPath: "src/",
  handler: "sns/index.main",
});
```

In this case, SST will zip the entire `src/` directory for the Lambda function.

#### Configure bundling

```js
new Function(this, "MySnsLambda", {
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
new Function(this, "MySnsLambda", {
  bundle: {
    esbuildConfig: {
      plugins: "config/esbuild.js",
    },
  },
  handler: "src/sns/index.main",
});
```

### Configure Bundling a Python Function

```js
new Function(this, "MySnsLambda", {
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
new Function(this, "MyApiLambda", {
  handler: "src/api.main",
  timeout: 10,
  environment: {
    TABLE_NAME: "notes",
  },
});
```

### Configuring a Dead Letter Queue

```js {5}
const queue = new Queue(this, "MyDLQ");

new Function(this, "MyApiLambda", {
  handler: "src/api.main",
  deadLetterQueue: queue.sqsQueue,
});
```

### Using SSM values as environment variables

```js
import { StringParameter } from "aws-cdk-lib/aws-ssm";

const apiKey = StringParameter.valueFromLookup(this, "my_api_key");

new Function(this, "MyApiLambda", {
  handler: "src/api.main",
  environment: {
    API_KEY: apiKey,
  },
});
```

The `API_KEY` environment variable can be accessed as `process.env.API_KEY` within the Lambda function.

### Configuring Provisioned Concurrency

```js {3-5,8}
const fn = new Function(this, "MyApiLambda", {
  handler: "src/api.main",
  currentVersionOptions: {
    provisionedConcurrentExecutions: 5,
  },
});

const version = fn.currentVersion;
```

Note that Provisioned Concurrency needs to be configured on a specific Function version. By default, versioning is not enabled, and setting `currentVersionOptions` has no effect. By accessing the `currentVersion` property, a version is automatically created with the provided options. 

### Use the IS_LOCAL environment variable

```js
export async function main(event) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Are we running locally: ${!!process.env.IS_LOCAL}`,
  };
}
```

## Properties

Refer to the properties made available by [`cdk.lambda.Function`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html#properties).

## Default Properties

If you have properties that need to be applied to all the functions in your app, they can be set on the App construct using the [`setDefaultFunctionProps`](constructs/App.md#specifying-default-function-props) method.

## Methods

An instance of `Function` contains the following methods.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](./Permissions)

Attaches the given list of [permissions](./Permissions) to the function. This method makes it easy to control the permissions you want the function to have access to. It can range from complete access to all AWS resources, all the way to a specific permission for a resource.

Head over to the [`Permissions`](./Permissions) docs to read about this in detail.

## FunctionProps

Takes the following construct props in addition to the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionOptions.html).

### functionName?

_Type_ : `string | ((props: FunctionNameProps) => string`, _defaults to auto-generated function name_

By default, `functionName` is auto-generated by CloudFormation template. You can configure the name by providing a `string`.

```js
{
  functionName: "my-function-name",
  handler: "src/lambda.main",
}
```

Or if you need to access the function's props, you can pass in a callback. For example, you can generate the function name based on the handler file name.

```js
{
  functionName: ({ functionProps, stack }) => (
    `${stack.stackName}-${path.parse(functionProps.handler).name}`
  ),
  handler: "src/lambda.main",
}
```

### handler

_Type_ : `string`

#### Node.js runtime

Path to the entry point and handler function. Uses the format, `/path/to/file.function`. Where the first part is the path to the file, followed by the name of the function that's exported in that file.

For example, if your handler file is in `src/lambda.js` and it exported a function called `main`. The `handler` would be `src/lambda.main`.

SST checks for a file with a `.ts`, `.tsx`, `.js`, or `.jsx` extension.

If the [`srcPath`](#srcpath) is set, then the path to the `handler` is relative to it. So if the `srcPath` is set to `src`. Then `lambda.main` as the `handler` would mean that the file is in `src/lambda.js` (or the other extensions).

#### Python runtime

Path to the entry point and handler function relative to the [`srcPath`](#srcpath). Uses the format, `path/to/file.function`. Where the first part is the path to the file, followed by the name of the function that's exported in that file.

For example, if your `srcPath` is `src/`, your handler file is in `src/lambda.py`, and it exported a function called `main`. The `handler` would be `lambda.main`.

#### Go runtime

Path to the handler function. Uses the format, `/path/to/file.go` or just `/path/to`.

If the [`srcPath`](#srcpath) is set, then the path to the `handler` is relative to it. So if the `srcPath` is set to `src`. Then `lambda.go` as the `handler` would mean that the file is in `src/lambda.go`.

#### C# (.NET) runtime

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

#### F# (.NET) runtime

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

### bundle?

_Type_ : `boolean | FunctionBundleNodejsProps | FunctionBundlePythonProps`, _defaults to_ `true`

#### Node.js runtime

Bundles your Lambda functions with [esbuild](https://esbuild.github.io). Turn this off if you have npm packages that cannot be bundled. Currently bundle cannot be disabled if the `srcPath` is set to the project root. [Read more about this here](https://github.com/serverless-stack/sst/issues/78).

If you want to configure the bundling process, you can pass in the [FunctionBundleNodejsProps](#functionbundlenodejsprops).

#### Python runtime

For Python functions, a dependency manager is used to install the packages. The dependency manager is selected based on which of the following files are found in the `srcPath`: 

| File | Steps |
|------|-------|
| `requirements.txt` | [pip](https://packaging.python.org/key_projects/#pip) is used to run `pip install` |
| `Pipfile` | [Pipenv](https://packaging.python.org/key_projects/#pipenv) is used to generate a `requirements.txt` and then `pip install` is run |
| `poetry.lock` | [poetry](https://packaging.python.org/key_projects/#poetry) is used to generate a `requirements.txt` and then `pip install` is run |

You can override this behavior by passing in the `installCommands` through the [FunctionBundlePythonProps](#functionbundlepythonprops).

Note that for Python functions, you'll need to have Docker installed. When building and deploying, this construct will handle installing all the required modules in a [Lambda compatible Docker container](https://github.com/aws/aws-sam-build-images/tree/develop/build-image-src), based on the runtime. This ensures that the Python Lambda functions are compiled correctly.

#### Go runtime

Only supported for the **Node.js** and **Python** runtimes.

#### C# (.NET) runtime

Only supported for the **Node.js** and **Python** runtimes.

#### F# (.NET) runtime

Only supported for the **Node.js** and **Python** runtimes.

### srcPath?

_Type_ : `string`, _defaults to the project root_

#### Node.js runtime

The directory that needs to zipped up as the Lambda function package. Only applicable if the [`bundle`](#bundle) option is set to `false`.

Note that for TypeScript functions, if the `srcPath` is not the project root, SST expects the `tsconfig.json` to be in this directory.

#### Python runtime

For Python functions, `srcPath` is required. This is the directory where the `requirements.txt`, `Pipfile`, or `poetry.lock` is expected.

#### Go runtime

The directory where `go.mod` is found.

#### C# (.NET) runtime

The directory where `.csproj` is found.

#### F# (.NET) runtime

The directory where `.fsproj` is found.

### enableLiveDev?

_Type_ : `boolean`, _defaults to true_

Can be used to disable [Live Lambda Development](../../live-lambda-development.md) when using `sst start`. Useful for things like Custom Resources that need to execute during deployment.

### memorySize?

_Type_ : `number`, _defaults to 1024_

The amount of memory in MB allocated to this function.

### timeout?

_Type_ : `number | cdk.core.Duration`, _defaults to 10_

The function execution timeout in seconds. You can pass in the timeout as a `number` or as [`cdk.core.Duration`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html).

### runtime?

_Type_ : `string | cdk.lambda.Runtime`, _defaults to_ `nodejs12.x`

The runtime environment. You can pass in the runtime as a `string` or as [`cdk.lambda.Runtime`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html). Only runtimes of the Node.js, Python, Go, and .NET (C# and F#) family are supported.

### tracing?

_Type_ : [`cdk.lambda.Tracing`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Tracing.html), _defaults to_ `cdk.lambda.Tracing.ACTIVE`

Turns on [AWS X-RAY for the Lambda function](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html), to enable tracing.

### permissions?

_Type_ : [`Permissions`](./Permissions), _defaults to_ `[]`

Attaches the given list of [permissions](./Permissions) to the function. Configuring this property is equivalent to calling [`attachPermissions`](#attachpermissions) after the function is created.

### layers?

_Type_ : [`cdk.lambda.ILayerVersion[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.ILayerVersion.html), _defaults to no layers_

A list of Layers to add to the function's execution environment.

Note that, if a Layer is created in a stack (say `stackA`) and is referenced in another stack (say `stackB`), SST automatically creates an SSM parameter in `stackA` with the Layer's ARN. And in `stackB`, SST reads the ARN from the SSM parameter, and then imports the Layer.

This is to get around the limitation that a Lambda Layer ARN cannot be referenced across stacks via a stack export. The Layer ARN contains a version number that is incremented everytime the Layer is modified. When you refer to a Layer's ARN across stacks, a CloudFormation export is created. However, CloudFormation does not allow an exported value to be updated. Once exported, if you try to deploy the updated layer, the CloudFormation update will fail. You can [read more about this issue here](https://github.com/serverless-stack/sst/issues/549).

## FunctionDefinition

_Type_ : `string | Function | FunctionProps`

All the high-level SST constructs that create a function internally accepts this as a type. So you can define a function by passing in the [handler](#handler) as a string:

```
"src/create.main"
```

Or the [`FunctionProps`](#functionprops):

```js
{
  bundle: false,
  srcPath: "src/",
  handler: "sns/index.main",
}
```

Or an instance of the Function itself.

```js
new Function(this, "Create", {
  handler: "src/create.main",
});
```

## FunctionNameProps

### functionProps

_Type_ : [`FunctionProps`](#functionprops)

The function props with all default function properties merged.

### stack

_Type_ : [`Stack`](Stack.md)

The Stack current function belongs to.

## FunctionBundleNodejsProps

### loader?

_Type_ : `{ [string]: esbuild.Loader }`, _defaults to_ `{}`

Use loaders to change how a given input file is interpreted. This prop is passed in to [esbuild's Loader option](https://esbuild.github.io/api/#loader).

It takes the extension of the file as the key and loader as the value. For example:

``` js
{
  ".svg": "text",
  ".png": "dataurl",
}
```

For more info, [check out the list of built-in content types (and loaders)](https://esbuild.github.io/content-types/) that esbuild supports.

### externalModules?

_Type_ : `string[]`, _defaults to_ `["aws-sdk"]`

A list of modules that should be considered as externals. An external is a module that will be _externally_ available in the Lambda function.

For example, the `aws-sdk` package is available in the Lambda runtime and does not have to be packaged with your function. Similarly, if you have a module that you are packaging as a Lambda Layer, you'll need to list that as an external.

### nodeModules?

_Type_ : `string[]`, _defaults to all modules are bundled_

A list of modules that should not be bundled but instead included in the `node_modules` folder of the Lambda package. This is useful when working with native dependencies or when `esbuild` fails to bundle a module.

For some background, esbuild will traverse through all the imported modules in your function and generate an optimal bundle. You can skip this process for some modules by passing them in as `nodeModules`.

Note that the modules listed in `nodeModules` must be present in the `package.json`'s dependencies. The same version will be used for installation. The lock file, `yarn.lock` or `package-lock.json`, will be used along with its respective installer, yarn or npm.

#### externalModules vs nodeModules

The two props `externalModules` and `nodeModules` might seem similar but there is one critical difference.

The `externalModules` are NOT included in your Lambda function package. It's expected that these are made available in the Lambda function environment. Typically meant for modules that are used as Lambda Layers.

The `nodeModules` on the other hand are included in the Lambda function package. But they are simply zipped up directly in a `node_modules/` directory. They are not bundled using esbuild. This is meant for modules that are not compatible with esbuild.

So for:

``` js
nodeModules: [ "uuid" ]
```

The Lambda function package will look like:

```
/
  lambda.js
  node_modules/
    uuid/
```

Whereas with:

``` js
externalModules: [ "uuid" ]
```

The Lambda function package will look like:

```
/
  lambda.js
```

The the `uuid` package is not bundled in the `lambda.js`. It is expected in the runtime as a Lambda Layer.

### copyFiles?

_Type_ : [`FunctionBundleCopyFilesProps[]`](#functionbundlecopyfilesprops), _defaults to_ `[]`

This allows you to specify a list of files that you want copied to the Lambda function package. Each item in the list contains a [`FunctionBundleCopyFilesProps`](#functionbundlecopyfilesprops) that includes the path in your local computer and the destination path in the Lambda function.

For example:

``` js
[
  { from: "frontend/public", to: "frontend" },
  { from: "templates", to: "html_templates" },
],
```

### commandHooks?

_Type_ : [`cdk.aws-lambda-nodejs.ICommandHooks`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.ICommandHooks.html), _defaults to `undefined`_

Configure a set commands to run during the bundling process. Takes a function for a given hook. For example:

``` js
{
  beforeBundling: (inputDir, outputDir) => {
    return [ "echo beforeBundling" ];
  },
  beforeInstall: (inputDir, outputDir) => {
    return [ "echo beforeInstall" ];
  },
  afterBundling: (inputDir, outputDir) => {
    return [ "echo afterBundling" ];
  },
}
```

[Read more](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.ICommandHooks.html) over on the CDK docs.

### format?

_Type_ : "esm" | "cjs", _defaults to `cjs`_

Controls the bundle format. To use [ES Modules](https://aws.amazon.com/blogs/compute/using-node-js-es-modules-and-top-level-await-in-aws-lambda/), set this as `esm`. Defaults to `cjs` or CommonJS.


``` js
{
  format: "esm"
}
```

### minify?

_Type_ : boolean, _defaults to `true`_

Controls whether output is minified.


``` js
{
  minify: false
}
```

### esbuildConfig?

_Type_ : [`FunctionBundleEsbuildConfig`](#functionbundleesbuildconfig), _defaults to no custom esbuild config_

This allows you to customize esbuild config.

## FunctionBundlePythonProps

### installCommands?

_Type_ : `string[]`, _defaults to `undefined`_

A list of commands to override the [default installing behavior](#bundle) for Python dependencies.

Each string in the array is a command that'll be run. For example:

``` js
[
  'export VARNAME="my value"',
  'pip install --index-url https://domain.com/pypi/myprivatemodule/simple/ --extra-index-url https://pypi.org/simple',
]
```

## FunctionBundleCopyFilesProps

### from

_Type_ : `string`

The path to the file or folder relative to the `srcPath`.

### to

_Type_ : `string`

The path in the Lambda function package the file or folder to be copied to.

## FunctionBundleEsbuildConfig

### define?

_Type_ : `{ [key: string]: string }`

Configures [Esbuild Define](https://esbuild.github.io/api/#define) option.

### keepNames?

_Type_ : `boolean`

Configures [Esbuild Keep names](https://esbuild.github.io/api/#keep-names) option.

### plugins?

_Type_ : `string`, _defaults to no custom esbuild config_

Path to a file that returns a an array of esbuild plugins.

For example:

``` js
{
  esbuildConfig: {
    plugins: "config/esbuild.js"
  },
}
```

Where `config/esbuild.js` looks something like this:

```js
const { esbuildDecorators } = require("@anatine/esbuild-decorators");

module.exports = [
  esbuildDecorators(),
];
```

:::note
Only the "plugins" option in the esbuild config file is currently supported.
:::
