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
new Function(scope: Construct, id: string, props: FunctionProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`FunctionProps`](#functionprops)

## Examples


### Creating a Function

```js
import { Function } from "@serverless-stack/resources";

new Function(this, "MySnsLambda", {
  handler: "src/sns/index.main",
});
```

## Properties
An instance of `Function` has the following properties.
### _isLiveDevEnabled

_Type_ : `boolean`

## Methods
An instance of `Function` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches additional permissions to function

#### Examples

```js {20}
fn.attachPermissions(["s3"]);
```

## FunctionProps


### bundle?

_Type_ : [`FunctionBundleNodejsProps`](#functionbundlenodejsprops)&nbsp; | &nbsp;[`FunctionBundlePythonProps`](#functionbundlepythonprops)&nbsp; | &nbsp;`boolean`

Configure or disable bundling options

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```

### enableLiveDev?

_Type_ : `boolean`

_Default_ : `true
`

Enable local development

#### Examples

```js
new Function(props.stack, "Function", {
  enableLiveDev: false
})
```

### functionName?

_Type_ : `string`&nbsp; | &nbsp;[`FunctionNameProps`](#functionnameprops) => `string`

_Default_ : `An automatically generated name
`

Override the automatically generated name

#### Examples

```js
new Function(props.stack, "Function", {
  functionName: "my-function",
})
```

### handler?

_Type_ : `string`

Path to the entry point and handler function. Of the format:
`/path/to/file.function`.

#### Examples

```js
new Function(props.stack, "Function", {
  handler: "src/function.handler",
})
```

### layers?

_Type_ : Array< [`ILayerVersion`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ILayerVersion.html) >

Configure layers for the function

#### Examples

```js
new Function(props.stack, "Function", {
  layers: [myLayer]
})
```

### memorySize?

_Type_ : `number`

_Default_ : `1024
`

The amount of memory in MB allocated.

#### Examples

```js
new Function(props.stack, "Function", {
  memorySize: 2048,
})
```

### permissions?

_Type_ : [`Permissions`](Permissions)

Configure permissions for the function

#### Examples

```js
new Function(props.stack, "Function", {
  permissions: ["ses", Bucket]
})
```

### runtime?

_Type_ : `"nodejs14.x"`&nbsp; | &nbsp;`"nodejs"`&nbsp; | &nbsp;`"nodejs4.3"`&nbsp; | &nbsp;`"nodejs6.10"`&nbsp; | &nbsp;`"nodejs8.10"`&nbsp; | &nbsp;`"nodejs10.x"`&nbsp; | &nbsp;`"nodejs12.x"`&nbsp; | &nbsp;`"python2.7"`&nbsp; | &nbsp;`"python3.6"`&nbsp; | &nbsp;`"python3.7"`&nbsp; | &nbsp;`"python3.8"`&nbsp; | &nbsp;`"python3.9"`&nbsp; | &nbsp;`"dotnetcore1.0"`&nbsp; | &nbsp;`"dotnetcore2.0"`&nbsp; | &nbsp;`"dotnetcore2.1"`&nbsp; | &nbsp;`"dotnetcore3.1"`&nbsp; | &nbsp;`"go1.x"`&nbsp; | &nbsp;[`Runtime`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Runtime.html)

_Default_ : `"nodejs12.x"
`

The runtime environment.

#### Examples

```js
new Function(props.stack, "Function", {
  runtime: "nodejs14.x",
})
```

### srcPath?

_Type_ : `string`

_Default_ : `Defaults to the same directory as sst.json
`

Root directory of the project, typically where package.json is located. Set if using a monorepo with multiple subpackages

#### Examples

```js
new Function(props.stack, "Function", {
  srcPath: "packages/backend",
  handler: "function.handler",
})
```

### timeout?

_Type_ : `number`&nbsp; | &nbsp;[`Duration`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html)

_Default_ : `10
`

The execution timeout in seconds.

#### Examples

```js
new Function(props.stack, "Function", {
  memorySize: 30,
})
```

### tracing?

_Type_ : [`Tracing`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Tracing.html)

_Default_ : `"active"
`

Enable AWS X-Ray Tracing.

#### Examples

```js
new Function(props.stack, "Function", {
  tracing: "pass_through",
})
```

## FunctionNameProps


### functionProps

_Type_ : [`FunctionProps`](#functionprops)

The function properties

### stack

_Type_ : [`Stack`](Stack)

The stack the function is being created in

## FunctionBundleNodejsProps
Used to configure NodeJS bundling options

### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
   format: "esm",
   minify: false
  }
})
```

### commandHooks?

_Type_ : [`ICommandHooks`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICommandHooks.html)

Hooks to run at various stages of bundling

### copyFiles?

_Type_ : Array< [`FunctionBundleCopyFilesProps`](#functionbundlecopyfilesprops) >

Used to configure additional files to copy into the function bundle

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```


### esbuildConfig.define?

_Type_ : Record<`string`, `string`>

Replace global identifiers with constant expressions.

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    esbuild: {
      define: DOCTODO
    }
  }
})
```

### esbuildConfig.keepNames?

_Type_ : `boolean`

When minifying preserve names of functions and variables

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    esbuild: {
      keepNames: true
    }
  }
})
```

### esbuildConfig.plugins?

_Type_ : `string`

Path to plugin file to load esbuild plugins

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    esbuild: {
      plugins: "path/to/plugins.js"
    }
  }
})
```


Override esbuild specific settings

### externalModules?

_Type_ : Array< `string` >

Packages that will not be included in the bundle. Usually used to exclude dependencies that are provided in layers

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    external: ["prisma"]
  }
})
```

### format?

_Type_ : `"cjs"`&nbsp; | &nbsp;`"esm"`

_Default_ : `"cjs"
`

Configure bundle format

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    format: "esm"
  }
})
```

### loader?

_Type_ : Record<`string`, [`Loader`](Loader)>

Configure additional esbuild loaders for other file extensions

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    loader: {
     ".png": "file"
    }
  }
})
```

### minify?

_Type_ : `boolean`

_Default_ : `true
`

Enable or disable minification

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    minify: false
  }
})
```

### nodeModules?

_Type_ : Array< `string` >

Packages that will be excluded from the bundle and installed into node_modules instead. Useful for dependencies that cannot be bundled, like those with binary dependencies.

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    nodeModules: ["pg"]
  }
})
```

## FunctionBundlePythonProps


### copyFiles?

_Type_ : Array< [`FunctionBundleCopyFilesProps`](#functionbundlecopyfilesprops) >

Used to configure additional files to copy into the function bundle

#### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```

### installCommands?

_Type_ : Array< `string` >

## FunctionBundleCopyFilesProps
Used to configure additional files to copy into the function bundle

### Examples

```js
new Function(props.stack, "Function", {
  bundle: {
    copyFiles: [{ from: "src/index.js" }]
  }
})
```

### from

_Type_ : `string`

Source path relative to sst.json

### to?

_Type_ : `string`

Destination path relative to function root in bundle
