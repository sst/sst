# ❍ Swift Example

Deploy Swift applications using sst ion.

## Build

Building your application for deployment requires installing Docker.

When deploying with `sst deploy` your application will be build for Amazon Linux, ensuring its compatible with the AWS Lambda provided runtime.

## Deploy

Deploy just like any other sst project:

```sh
sst deploy --stage production
```

### GitHub Actions

When deploying from your local machine, your application is built with Docker. If you want to deploy from GitHub Actions or another CI service, you'll need to use the swift:5.10-amazonlinux2 image.

## Multiple Targets

A simple Swift application might include just one lambda function to act as an http server. But a more complex application will want to take advantage of queues and other event driven architectures. This is trivial to do, simply create more `sst.aws.Function`s and reference the relevant target for that function in `build(someTarget)`. Any `executableTarget` in your `Package.swift` can be passed to build.

Here's an example of hooking up a target to an SQS Queue:

```typescript
const queue = new sst.aws.Queue("SwiftQueue", {});
queue.subscribe({
  runtime: "provided.al2023",
  architecture: process.arch === "arm64" ? "arm64" : "x86_64",
  bundle: build("queue"),
  handler: "bootstrap",
});
```
