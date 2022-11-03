---
title: Storage
description: "Learn to store files in your SST app."
---

SST provides a simple way to store and serve files using the [`Bucket`](constructs/Bucket.md) construct powered by [Amazon S3](https://aws.amazon.com/s3/).

Here are a few key terms to understand about S3.

- **Files** are just like the files on your computer. They can be text documents, images, videos, or any data files. It is best practice to store files outside of your database because of their sizes.

- **Folders** are a way to organize your files. A folder can also contain other folders.

- **Buckets** are distinct containers for files and folders. AWS account has soft limit of 100 buckets per AWS account. You can request to have the limit raised.

You can use the [SST Console](console.md) to manage your files in your buckets.

![SST Console Buckets tab](/img/console/sst-console-buckets-tab.png)

It allows you upload, delete, and download files. You can also create and delete folders.

## Creating a Bucket

```js
import { Bucket } from "@serverless-stack/resources";

new Bucket(stack, "myFiles");
```

## Accessing files in Lambda Functions

To access your files inside a Lambda Function, you need to bind the bucket to the function.

```js {10,12}
import { Bucket, Function } from "@serverless-stack/resources";

// Create a Bucket
const bucket = new Bucket(stack, "myFiles");

// Create a Function that will access the Bucket
new Function(stack, "Function", {
  handler: "src/lambda.main",
  bind: [bucket],
});
```

You can then use the AWS S3 SDK to access files in the Bucket.

```js title="src/lambda.js"
import { Bucket } from "@serverless-stack/node/bucket";
import AWS from "aws-sdk";
const S3 = new AWS.S3();

export async function main(event) {
  // Download file
  const file = S3.getObject({
    Bucket: Bucket.myFiles.bucketName,
    Key: "path/to/file.png",
  });

  // ...
}
```

## Accessing files in a web app

### Granting access with presigned URL

Your users won't have direct access to files in your Bucket. You need to create an API endpoint that generates presigned URLs for the file they want to upload.

```js
const bucket = new Bucket(stack, "myFiles");

new Api(stack, "Api", {
  bind: [bucket],
  routes: {
    "POST /presigned-url": "src/generatePresignedUrl.main",
  },
});
```

And the Lambda function requests a URL from S3.

```js
import { Bucket } from "@serverless-stack/node/bucket";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const signedUrl = s3.getSignedUrl("putObject", {
  Bucket: Bucket.myFiles.bucketName,
  Key: "path/to/folder",
});
```

Then in your web app, we can make a request to the signed url to upload the file.

```js
const formData = new FormData();

formData.append("Content-Type", fileType);
formData.append("file", fileContents);

fetch(signedUrl, {
  method: "POST",
  body: formData,
});
```

### Granting access with Cognito Identity Pool

Another option is to use Cognito Identity Pool to grant temporary IAM permissions for both the authenticated and unauthenticated users in your web app. If you are using the [`Cognito`](constructs/Cognito.md) construct to manage your users, you can grant the permissions like so:

```js
const bucket = new Bucket(stack, "myFiles");

const auth = new Cognito(stack, "Auth", { ... });

// Granting permissions to authenticated users
auth.attachPermissionsForAuthUsers(stack, [bucket]);
```

You can also grant authenticated users access to a specific folder.

```js
auth.attachPermissionsForAuthUsers(stack, [
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

Then in your web app, you can use the [aws-amplify](https://www.npmjs.com/package/aws-amplify) package to upload to the Bucket.

```js
import { Storage } from "aws-amplify";

await Storage.vault.put(filename, file, {
  contentType: file.type,
});
```

## Bucket notifications

You can receive notifications when certain events happen in the Bucket. These can be used to trigger a Lambda function.

```js
new Bucket(stack, "myFiles", {
  notifications: ["src/s3Notification.main"],
});
```

Check out more Bucket notification examples over on the [`Bucket`](constructs/Bucket.md#enabling-s3-event-notifications) construct doc.

:::tip Example

Read this tutorial on automatically resizing images uploaded to a Bucket.

[READ TUTORIAL](https://sst.dev/examples/how-to-automatically-resize-images-with-serverless.html)

:::
