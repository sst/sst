# ❍ AWS Dart API Example

Deploy a Dart API on AWS using SST ION.

**IMPORTANT:** Docker must be installed to use this approach.

This project was initiated as a standard Dart package, and then SST was initialized using the command:

```bash
sst init
```

The **aws_lambda_dart_runtime** package was added to the project using the katallaxie GitHub fork:

```yaml
dependencies:
  aws_lambda_dart_runtime:
    git:
      url: https://github.com/katallaxie/aws-lambda-dart-runtime
```

In the `lib/src/main.dart` a simple hello-world function named `hello` has been registered to the `Runtime` singleton:

```dart
import 'package:aws_lambda_dart_runtime/aws_lambda_dart_runtime.dart';
import 'package:aws_lambda_dart_runtime/runtime/context.dart';

void main() async {
  /// This demo's handling an API Gateway request.
  hello(Context context, AwsApiGatewayEvent event) async {
    final response = {
      "message": "Hello from Dart!",
    };
    return AwsApiGatewayResponse.fromJson(response);
  }

  /// The Runtime is a singleton. You can define the handlers as you wish.
  Runtime()
    ..registerHandler<AwsApiGatewayEvent>(
      'hello',
      hello,
    )
    ..invoke();
}
```

Inside root folder a `build.sh` file was created with the necessary commands to compile the Linux binary:

```bash
#!/bin/sh

# Install dependencies
dart pub get

# build the binary
dart compile exe bin/main.dart -o dist/bootstrap

# Exit
exit
```

Lastly, the `sst.config.ts` file was modified to create the API:

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-dart-api",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayV2("MyApi");
    api.route("GET /", {
      runtime: "provided.al2023",
      architecture: process.arch === "arm64" ? "arm64" : "x86_64",
      bundle: build(),
      handler: "hello",
    });
  },
});

function build() {
  require("child_process").execSync(`
mkdir -p .build
docker run -v $PWD:/app -w /app --entrypoint ./build.sh dart:stable-sdk
`);
  return `.build/`;
}
```

## Build

Building your application for deployment requires installing Docker.

When deploying with `sst deploy`, your application will be built for Amazon Linux, ensuring it's compatible with the AWS Lambda provided runtime.

## Deploy

Deploy just like any other sst project:

```sh
sst deploy --stage production
```
