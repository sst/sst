---
description: "Docs for the sst.Function construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
A construct for a Lambda Function that allows you to [develop your it locally](live-lambda-development.md). Supports JS, TypeScript, Python, Golang, and C#. It also applies a couple of defaults:

- Sets the default memory setting to 1024MB.
- Sets the default Lambda function timeout to 10 seconds.
- [Enables AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html) by default so you can trace your serverless applications.
- `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is turned on. Meaning that the Lambda function will automatically reuse TCP connections when working with the AWS SDK. [Read more about this here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html).
- Sets the `IS_LOCAL` environment variable for the Lambda function when it is invoked locally through the `sst start` command.


## Constructor
```ts
new Function(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[FunctionProps](#functionprops)</span>

## Examples


### Creating a Function

```js
import { Function } from "@serverless-stack/resources";

new Function(stack, "MySnsLambda", {
  handler: "src/sns/index.main",
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

Bundles your Lambda functions with [esbuild](https://esbuild.github.io). Turn this off if you have npm packages that cannot be bundled. Currently bundle cannot be disabled if the `srcPath` is set to the project root. [Read more about this here](https://github.com/serverless-stack/serverless-stack/issues/78).

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

#### Configuring VPC

```js
import * as ec2 from "aws-cdk-lib/aws-ec2";

// Create a VPC
const vpc = new ec2.Vpc(this, 'MyVPC');

// Alternatively use an existing VPC
const vpc = ec2.Vpc.fromLookup(stack, 'VPC', { ... });

new Function(stack, "MyApiLambda", {
  handler: "src/api.main",
  vpc,
  vpcSubnet: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
  }
});
```

If you need access to resources within a VPC, then run your AWS Lambda function within a VPC. If you do not require this access, then do not run it within a VPC.

Read more about [working with VPC](https://docs.sst.dev/live-lambda-development#working-with-a-vpc).
## FunctionProps


### architecture?

_Type_ : <span class='mono'><span class="mono">"arm_64"</span> | <span class="mono">"x86_64"</span></span>

_Default_ : <span class="mono">"x86_64"</span>

The CPU architecture of the lambda function.


```js
new Function(stack, "Function", {
  architecture: "arm_64",
})
```

### bundle?

_Type_ : <span class='mono'><span class="mono">[FunctionBundleNodejsProps](#functionbundlenodejsprops)</span> | <span class="mono">[FunctionBundlePythonProps](#functionbundlepythonprops)</span> | <span class="mono">boolean</span></span>

Configure or disable bundling options


```js
new Function(stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```

### diskSize?

_Type_ : <span class='mono'><span class="mono">number</span> | <span class="mono">${number} MB</span> | <span class="mono">${number} GB</span></span>

_Default_ : <span class="mono">"512 MB"</span>

The amount of disk storage in MB allocated.


```js
new Function(stack, "Function", {
  diskSize: "2 GB",
})
```

### enableLiveDev?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">true</span>

Can be used to disable Live Lambda Development when using `sst start`. Useful for things like Custom Resources that need to execute during deployment.


```js
new Function(stack, "Function", {
  enableLiveDev: false
})
```

### environment?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>

Configure environment variables for the function


```js
new Function(stack, "Function", {
  environment: {
    TABLE_NAME: table.tableName,
  }
})
```

### functionName?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[FunctionNameProps](#functionnameprops)</span> => <span class="mono">string</span></span>

_Default_ : <span class="mono">Auto-generated function name</span>

By default, the name of the function is auto-generated by AWS. You can configure the name by providing a string.


```js
new Function(stack, "Function", {
  functionName: "my-function",
})
```

### handler?

_Type_ : <span class="mono">string</span>

Path to the entry point and handler function. Of the format:
`/path/to/file.function`.


```js
new Function(stack, "Function", {
  handler: "src/function.handler",
})
```

### layers?

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">string</span> | <span class="mono">[ILayerVersion](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.ILayerVersion.html)</span></span>&gt;</span>

_Default_ : <span class="mono">no layers</span>

A list of Layers to add to the function's execution environment.
Note that, if a Layer is created in a stack (say `stackA`) and is referenced in another stack (say `stackB`), SST automatically creates an SSM parameter in `stackA` with the Layer's ARN. And in `stackB`, SST reads the ARN from the SSM parameter, and then imports the Layer.

 This is to get around the limitation that a Lambda Layer ARN cannot be referenced across stacks via a stack export. The Layer ARN contains a version number that is incremented everytime the Layer is modified. When you refer to a Layer's ARN across stacks, a CloudFormation export is created. However, CloudFormation does not allow an exported value to be updated. Once exported, if you try to deploy the updated layer, the CloudFormation update will fail. You can read more about this issue here - https://github.com/serverless-stack/serverless-stack/issues/549.


```js
new Function(stack, "Function", {
  layers: ["arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:22", myLayer]
})
```

### memorySize?

_Type_ : <span class='mono'><span class="mono">number</span> | <span class="mono">${number} MB</span> | <span class="mono">${number} GB</span></span>

_Default_ : <span class="mono">"1 GB"</span>

The amount of memory in MB allocated.


```js
new Function(stack, "Function", {
  memorySize: "2 GB",
})
```

### permissions?

_Type_ : <span class="mono">[Permissions](Permissions)</span>

Attaches the given list of permissions to the function. Configuring this property is equivalent to calling `attachPermissions()` after the function is created.


```js
new Function(stack, "Function", {
  permissions: ["ses", bucket]
})
```

### runtime?

_Type_ : <span class='mono'><span class="mono">"nodejs"</span> | <span class="mono">"nodejs4.3"</span> | <span class="mono">"nodejs6.10"</span> | <span class="mono">"nodejs8.10"</span> | <span class="mono">"nodejs10.x"</span> | <span class="mono">"nodejs12.x"</span> | <span class="mono">"nodejs14.x"</span> | <span class="mono">"nodejs16.x"</span> | <span class="mono">"python2.7"</span> | <span class="mono">"python3.6"</span> | <span class="mono">"python3.7"</span> | <span class="mono">"python3.8"</span> | <span class="mono">"python3.9"</span> | <span class="mono">"dotnetcore1.0"</span> | <span class="mono">"dotnetcore2.0"</span> | <span class="mono">"dotnetcore2.1"</span> | <span class="mono">"dotnetcore3.1"</span> | <span class="mono">"dotnet6"</span> | <span class="mono">"go1.x"</span></span>

_Default_ : <span class="mono">"nodejs14.x"</span>

The runtime environment. Only runtimes of the Node.js, Python, Go, and .NET (C# and F#) family are supported.


```js
new Function(stack, "Function", {
  runtime: "nodejs16.x",
})
```

### srcPath?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">Defaults to the same directory as sst.json</span>

Root directory of the project, typically where package.json is located. Set if using a monorepo with multiple subpackages


```js
new Function(stack, "Function", {
  srcPath: "packages/backend",
  handler: "function.handler",
})
```

### timeout?

_Type_ : <span class='mono'><span class="mono">number</span> | <span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

_Default_ : <span class="mono">"10 seconds"</span>

The execution timeout in seconds.


```js
new Function(stack, "Function", {
  timeout: "30 seconds",
})
```

### tracing?

_Type_ : <span class='mono'><span class="mono">"active"</span> | <span class="mono">"pass_through"</span> | <span class="mono">"disabled"</span></span>

_Default_ : <span class="mono">"active"</span>

Enable AWS X-Ray Tracing.


```js
new Function(stack, "Function", {
  tracing: "pass_through",
})
```

## Properties
An instance of `Function` has the following properties.
## Methods
An instance of `Function` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches additional permissions to function


```js {20}
fn.attachPermissions(["s3"]);
```

## FunctionNameProps


### functionProps

_Type_ : <span class="mono">[FunctionProps](#functionprops)</span>

The function properties

### stack

_Type_ : <span class="mono">[Stack](Stack#stack)</span>

The stack the function is being created in

## FunctionHandlerProps


### bundle

_Type_ : <span class='mono'><span class="mono">[FunctionBundleNodejsProps](#functionbundlenodejsprops)</span> | <span class="mono">[FunctionBundlePythonProps](#functionbundlepythonprops)</span> | <span class="mono">boolean</span></span>

### handler

_Type_ : <span class="mono">string</span>

### runtime

_Type_ : <span class="mono">string</span>

### srcPath

_Type_ : <span class="mono">string</span>

## FunctionBundleNodejsProps
Used to configure NodeJS bundling options


```js
new Function(stack, "Function", {
  bundle: {
   format: "esm",
   minify: false
  }
})
```

### commandHooks?

_Type_ : <span class="mono">[ICommandHooks](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.ICommandHooks.html)</span>

Hooks to run at various stages of bundling

### copyFiles?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[FunctionBundleCopyFilesProps](#functionbundlecopyfilesprops)</span>&gt;</span>

Used to configure additional files to copy into the function bundle


```js
new Function(stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```


### esbuildConfig.define?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>

Replace global identifiers with constant expressions.


```js
new Function(stack, "Function", {
  bundle: {
    esbuildConfig: {
      define: {
        str: "text"
      }
    }
  }
})
```

### esbuildConfig.keepNames?

_Type_ : <span class="mono">boolean</span>

When minifying preserve names of functions and variables


```js
new Function(stack, "Function", {
  bundle: {
    esbuildConfig: {
      keepNames: true
    }
  }
})
```

### esbuildConfig.plugins?

_Type_ : <span class="mono">string</span>

Path to a file that returns an array of esbuild plugins


```js
new Function(stack, "Function", {
  bundle: {
    esbuildConfig: {
      plugins: "path/to/plugins.js"
    }
  }
})
```

Where `path/to/plugins.js` looks something like this:

```js
const { esbuildDecorators } = require("@anatine/esbuild-decorators");

module.exports = [
  esbuildDecorators(),
];
```


This allows you to customize esbuild config.

### externalModules?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

Packages that will not be included in the bundle. Usually used to exclude dependencies that are provided in layers


```js
new Function(stack, "Function", {
  bundle: {
    externalModules: ["prisma"]
  }
})
```

### format?

_Type_ : <span class='mono'><span class="mono">"cjs"</span> | <span class="mono">"esm"</span></span>

_Default_ : <span class="mono">"cjs"</span>

Configure bundle format


```js
new Function(stack, "Function", {
  bundle: {
    format: "esm"
  }
})
```

### loader?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[Loader](https://esbuild.github.io/api/#loader)</span>&gt;</span>

Configure additional esbuild loaders for other file extensions


```js
new Function(stack, "Function", {
  bundle: {
    loader: {
     ".png": "file"
    }
  }
})
```

### minify?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">true</span>

Enable or disable minification


```js
new Function(stack, "Function", {
  bundle: {
    minify: false
  }
})
```

### nodeModules?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

Packages that will be excluded from the bundle and installed into node_modules instead. Useful for dependencies that cannot be bundled, like those with binary dependencies.


```js
new Function(stack, "Function", {
  bundle: {
    nodeModules: ["pg"]
  }
})
```

### sourcemap?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">false</span>

Configure if sourcemaps are generated when the function is bundled for production. Since they increase payload size and potentially cold starts they are not generated by default. They are always generated during local development mode.


```js
new Function(stack, "Function", {
  bundle: {
  sourcemap: true
  }
})
```

## FunctionBundlePythonProps
Used to configure Python bundling options

### copyFiles?

_Type_ : <span class='mono'>Array&lt;<span class="mono">[FunctionBundleCopyFilesProps](#functionbundlecopyfilesprops)</span>&gt;</span>

Used to configure additional files to copy into the function bundle


```js
new Function(stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```

### installCommands?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">"[]"</span>

A list of commands to override the [default installing behavior](Function#bundle) for Python dependencies.
Each string in the array is a command that'll be run. For example:


```js
new Function(stack, "Function", {
  bundle: {
    installCommands: [
      'export VARNAME="my value"',
      'pip install --index-url https://domain.com/pypi/myprivatemodule/simple/ --extra-index-url https://pypi.org/simple -r requirements.txt .',
    ]
  }
})
```

## FunctionBundleCopyFilesProps
Used to configure additional files to copy into the function bundle


```js
new Function(stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```

### from

_Type_ : <span class="mono">string</span>

Source path relative to sst.json

### to?

_Type_ : <span class="mono">string</span>

Destination path relative to function root in bundle
