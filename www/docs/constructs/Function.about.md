A construct for a Lambda Function that allows you to [develop it locally](live-lambda-development.md). Supports JS, TypeScript, Python, Golang, C#, Rust, and container runtime. It also applies a couple of defaults:

- Sets the default memory setting to 1024MB.
- Sets the default Lambda function timeout to 10 seconds.
- [Enables AWS X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html) by default so you can trace your serverless applications.
- `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is turned on. Meaning that the Lambda function will automatically reuse TCP connections when working with the AWS SDK. [Read more about this here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html).
- Sets the `IS_LOCAL` environment variable for the Lambda function when it is invoked locally through the `sst dev` command.

## Examples

### Creating a Function

```js
import { Function } from "sst/constructs";

new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
});
```

### Creating a Container Function

To create a container function, set `runtime` to "container" and point the handler to the directory containing the Dockerfile.

```js
new Function(stack, "MyFunction", {
  runtime: "container",
  handler: "src/lambda",
});
```

Lambda will run the function specified in `CMD` section of the Dockerfile. If you want to create multiple functions from the same image but each with a different function, you can override the `CMD`:

```js {5,13}
new Function(stack, "MyFunction", {
  runtime: "container",
  handler: "src/lambda",
  container: {
    cmd: ["get.handler"]
  }
});

new Function(stack, "MyFunction", {
  runtime: "container",
  handler: "src/lambda",
  container: {
    cmd: ["put.handler"]
  }
});
```

### Setting additional props

Use the [`cdk.lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionOptions.html) to set additional props.

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
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

const apiKey = StringParameter.valueFromLookup(stack, "my_api_key");

new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
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

For example, if your handler file is in `src/lambda.ts` and it exported a function called `main`. The handler would be `src/lambda.handler`.

SST checks for a file with a `.ts`, `.tsx`, `.js`, or `.jsx` extension.


### Configuring Python runtime

#### handler

Path to the entry point and handler function relative to the root. Uses the format, `path/to/file.function`. Where the first part is the path to the file, followed by the name of the function that's exported in that file.

### Configuring Go runtime

#### handler

Path to the handler function. Uses the format, `/path/to/file.go` or just `/path/to`.

### Configuring Container runtime

#### handler

Path to the directory containing the `Dockerfile` relative to the root.

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

### Configuring Java runtime

#### Building a deployment package with Gradle

To create a deployment package with your function's code and dependencies, use the Zip build type. For example:

```
task buildZip(type: Zip) {
    from compileJava
    from processResources
    into('lib') {
        from configurations.runtimeClasspath
    }
}
```

This build configuration produces a deployment package in the `build/distributions` directory. The `compileJava` task compiles your function's classes. The `processResources` task copies the Java project resources into their target directory, potentially processing then. The statement `into('lib')` then copies dependency libraries from the build's classpath into a folder named `lib`.

On `sst deploy`, SST runs `gradle build` to build the function. The build output has the follow content:

```
build
├─ classes
├─ distributions
│  ├─ java-hello-world.tar
│  └─ java-hello-world.zip
├─ generated
├─ libs
│  └─ java-hello-world.jar
├─ scripts
└─ tmp
```

And SST uploads the `distributions/java-hello-world.zip` as the Lambda function's code.

On `sst dev`, SST runs `gradle build` first. And then it unzips `distributions/java-hello-world.zip` to `distributions`. Now the `distributions/lib` folder contains all the dependency libraries. Both `distributions/lib/*` and `libs/*` are included as class paths when invoking the function under [Live Lambda Dev](../live-lambda-development.md).

:::note
Currenly, we only support Java projects built with **Gradle**. If you need to support other build systems, please join our [Discord community](http://discord.gg/sst) and message us in the #help channel.
:::

#### handler

The handler function. Uses the format, `package.Class::method`.

- `package` is the package name.
- `Class` is the class name.
- `method` is the name of the function handler.

Consider a project with the following handler function:

```java
package example

public class Handler implements RequestHandler<Map<String,String>, String>{

  @Override
  public Map<String, Object> handleRequest(Map<String, String> input, Context context) {
  }
}
```

The handler would be: `example.Handler::handleRequest`.

#### options

If you want to configure the bundling process, you can pass in the [FunctionBundleJavaProps](#functionbundlejavaprops).

```ts
new Function(stack, "MyLambda", {
  java: {
    buildTask: "bundle",
    buildOutputDir: "output",
  },
  handler: "example.Handler::handleRequest",
  runtime: "java17",
});
```

### Configuring Rust runtime (beta)

#### handler

Path to the handler function. Uses the format, `/path/to/file.rs`.

Note that there needs to be a `bin` field in your `Cargo.toml` with a name that matches the file's name.

For example, if your handler file is in `src/main.rs`, then you should include the following block in your `Cargo.toml`:

```toml
[[bin]]
name = "main"
path = "src/main.rs"
```

### Function URLs

#### Using the basic config

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
  url: true,
});
```

#### Authorization

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
  url: {
    authorizer: "iam",
  },
});
```

#### Disabling CORS

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
  url: {
    cors: false,
  },
});
```

#### Configuring CORS

```js
new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
  url: {
    cors: {
      allowMethods: ["GET", "POST"],
      allowOrigins: ["https://domain.com"],
    },
  },
});
```

### Advanced examples

#### Configuring a Dead Letter Queue

```js {5}
const queue = new Queue(stack, "MyDLQ");

new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
  deadLetterQueue: queue.cdk.queue,
});
```

#### Configuring Provisioned Concurrency

```js {3-5,8}
const fn = new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
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
const vpc = new ec2.Vpc(stack, 'MyVPC');

// Alternatively use an existing VPC
const vpc = ec2.Vpc.fromLookup(stack, 'VPC', { ... });

new Function(stack, "MyFunction", {
  handler: "src/lambda.handler",
  vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
  }
});
```

If you need access to resources within a VPC, then run your AWS Lambda function within a VPC. If you do not require this access, then do not run it within a VPC.

Read more about [working with VPC](https://docs.sst.dev/live-lambda-development#working-with-a-vpc).
