---
title: Storage 🟢
description: "How to store files in your SST app"
---

SST provides a simple way to store and serve files using the [`Bucket`](../constructs/Bucket.md) construct.

## Overview

Here are a few key term to understand.

- **Files** are just like the files on your computer. They can be text documents, images, videos, or any data files. It is best practice to store files outside of your database because of their sizes.

- **Folders** are a way to organize your files. A folder can also contain other folders.

- **Buckets** are distinct containers for files and folders. AWS account has soft limit of 100 folders per AWS account. You can request to have the limit raised.

## Creating a Bucket

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(this, "Bucket");
```

## Accessing files in Lambda Functions

To access files inside Lambda Functions, you need to pass the Bucket name to the Function as an environment variable, and also grant the Function permission to access the Bucket.

```js
import { Bucket, Function } from "@serverless-stack/resources";

// Create a Bucket
const bucket = new Bucket(this, "Bucket");

// Create a Function that will access the Bucket
new Function(this, "Function", {
  handler: "src/lambda.main",
  environment: {
    BUCKET_NAME: bucket.bucketName,
  },
  permissions: [bucket],
});
```

And use AWS S3 SDK to access files in the Bucket.

```js title="src/lambda.js"
import AWS from "aws-sdk";
const S3 = new AWS.S3();

export async function main(event) {
  // Download file
  const file = S3.getObject({
    Bucket: process.env.BUCKET_NAME,
    Key: "path/to/file.png",
  }).promise();

  ...
}
```

## Accessing files in web app

### Granting access with presigned URL

Your users won't have direct access to files in your S3 file storage. You need to create an API endpoint that generates presigned URLs for the file they want to upload.

```js
const bucket = new Bucket(this, "Bucket");

new Api(this, "Api", {
  environment: {
    BUCKET_NAME: bucket.bucketName,
  },
  permissions: [bucket],
  routes: {
    "POST /presigned-url": "src/generatePresignedUrl.main",
    // add other routes
  },
});
```

And the Lambda function requests a URL from S3.

```js
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const signedUrl = s3.getSignedUrl('putObject', {
  Bucket: process.env.BUCKET_NAME,
  Key: "path/to/folder",
});
```

In your web app, make a POST request to the signed url to upload the file.

```js
fetch(signedUrl, {
  method: 'POST',
  body: JSON.stringify({ user }),
  headers: { 'Content-Type': 'application/json' },
}).then(...);
```

### Granting access with Cognito Identity Pool

You can use Cognito Identity Pool to grant temporary IAM permissions for both the authenticated and unauthenticated users in your web app. If you are using the [`Auth`](../constructs/Auth.md) construct to manage your users, you can grant the permissions like this:

```js
const bucket = new Bucket(this, "MyBucket");

const auth = new Auth(this, "Auth", { ... });

// Granting permissions to authenticated users
auth.attachPermissionsForAuthUsers([bucket]);
```

You can also grant authenticated users access to a specific folder.

```js
auth.attachPermissionsForAuthUsers([
  // Policy granting access to the folder named with their user id
  new iam.PolicyStatement({
    actions: ["s3:*"],
    effect: iam.Effect.ALLOW,
    resources: [
      bucket.bucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
    ],
  }),
]);
```

In your web app, you can use the `aws-amplify` library to upload to the Bucket.

```js
import { Storage } from "aws-amplify";

await Storage.vault.put(filename, file, {
  contentType: file.type,
});
```

## Bucket notifications

You can receive notifications when certain events happen in the Bucket.

```js
new Bucket(this, "MyBucket", {
  notifications: ["src/s3Notification.main"],
});
```

See more Bucket notification examples in the [`Bucket doc`](../constructs/Bucket.md#enabling-s3-event-notifications)

:::info Example

This tutorial steps through automatially resizing images uploaded to S3.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-automatically-resize-images-with-serverless.html)

:::
