# SST v3 Flutter Web

This project demonstrates how to deploy a Flutter website to AWS CloudFront using SST v3.

It's a simple setup where a Flutter-based web application (a demo counter app) is built and deployed directly through SST v3 with minimal configuration.

## Prerequisites

Before you begin, ensure you have the following installed:

- AWS Credentials ([Guide on loading from a file](https://docs.sst.dev/advanced/iam-credentials#loading-from-a-file))
- SST CLI ([Documentation](https://sst.dev/docs/reference/cli))

## Getting Started

### Step 1: Create the Flutter Project

Create a new Flutter project:

```bash
flutter create aws_flutter_web
```

### Step 2: Initialize SST v3

Navigate to the root folder of your project and initialize SST v3, selecting AWS as your cloud provider:

```bash
sst init
```

### Step 3: Configure the Project

Edit the `sst.config.ts` file in your project's root directory to set up the deployment settings. Here's an example configuration:

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-flutter-web",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.StaticSite("MySite", {
      build: {
        command: "flutter build web",
        output: "build/web",
      },
    });
  },
});
```

A new instance of `sst.aws.StaticSite` has been added to the `run` method. This construct facilitates the configuration and management of static site deployments on AWS.
`"FlutterSite"` is the name given to this particular static site deployment.

The build object is configured with key properties to define the build process for the Flutter web application:

- `command`: The command to build the Flutter web application (`flutter build web`).
- `output`: The directory where the build outputs will be stored, which in this case is `build/web`.

### Step 4: Deploy to CloudFront

Deploy your application to CloudFront using the following command:

```bash
sst deploy --stage production
```

Once deployed, your Flutter web application will be accessible through the URL provided by CloudFront. You can interact with your demo counter app directly via this URL.

### Step 5: Remove

Eventually remove the website using the following command:

```bash
sst remove --stage production
```
