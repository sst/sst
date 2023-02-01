---
title: Resource Binding
description: "Access the resources in your SST app in a secure and typesafe way."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Access the resources in your app in a secure and typesafe way.

</HeadlineText>

---

## Overview

**Resource Binding** allows you to connect your functions with your infrastructure. This is done in two steps:

1. Bind a resource to the functions in your infrastructure code through the `bind` prop.
2. Use the [`sst/node`](clients/index.md) package to access the resource in your function.

---

## Quick start

To see how Resource Binding works, we are going to create an S3 bucket and bind it to a Lambda function.

Follow along by creating the Minimal TypeScript starter by running `npx create-sst@latest` > `minimal` > `minimal/typescript-starter`. Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/minimal-typescript) that's based on the same template.

1. To create a new bucket, open up `stacks/MyStack.ts` and add a [`Bucket`](constructs/Bucket.md) construct below the API.

   ```ts title="stacks/MyStack.ts"
   const bucket = new Bucket(stack, "myFiles");
   ```

   You'll also need to import `Bucket` at the top.

   ```ts
   import { Bucket } from "sst/constructs";
   ```

2. Then, bind the `bucket` to the `api`.

   ```ts title="stacks/MyStack.ts"
   api.bind([bucket]);
   ```

3. Now we can access the bucket's name in our API using the [`Bucket`](clients/bucket.md) helper. Change `services/functions/lambda.ts` to:

   ```ts title="services/functions/lambda.ts" {10}
   import { APIGatewayProxyHandlerV2 } from "aws-lambda";
   import { Bucket } from "sst/node/bucket";
   import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
   const s3 = new S3Client({});

   export const handler: APIGatewayProxyHandlerV2 = async (event) => {
     // Upload a file to the bucket
     await s3.send(
       new PutObjectCommand({
         Bucket: Bucket.myFiles.bucketName,
         Key: "greeting.txt",
         Body: "Hello world!",
       })
     );

     return {
       statusCode: 200,
       headers: { "Content-Type": "text/plain" },
       body: `File uploaded`,
     };
   };
   ```

   And install the AWS SDK for this example.

   ```bash
   npm install --save @aws-sdk/client-s3
   ```

   That's it!

---

## Features

Let's take a look at some of the key features of Resource Binding, and how it makes building apps fun and easy again.

---

### Typesafety

In the above example, the `Bucket` object that's imported from `sst/node/bucket` is typesafe. Your editor should be able to autocomplete the bucket name `myFiles`, as well as its property `bucketName`.

<details>
<summary>Behind the scenes</summary>

Let's take a look at how this is all wired up.

1. First, the `sst/node/table` package predefines an interface.

   ```ts
   export interface BucketResources {}
   ```

2. When SST builds the app, it generates a type file and adds the bucket name to the `BucketResources` interface.

   ```ts title="node_modules/@types/serverless-stack__node/Bucket-myFiles.d.ts"
   import "sst/node/bucket";
   declare module "sst/node/bucket" {
     export interface BucketResources {
       myFiles: {
         bucketName: string;
       };
     }
   }
   ```

   This type file then gets appended to `index.d.ts`.

   ```ts title="node_modules/@types/@serverless-stack__node/index.d.ts"
   export * from "./Bucket-myFiles";
   ```

3. So when the `Bucket` object is imported from `sst/node/bucket`, it has the type `BucketResources`.

</details>

---

### Error handling

If you reference a resource that doesn't exist in your SST app, or hasn't been bound to the function, you'll get a runtime error.

For example, if you forget to bind the `bucket` to the API, you'll get the following error when the function is invoked.

```
Cannot use Bucket.myFiles. Please make sure it is bound to this function.
```

---

### Testing

When testing your code, you can use the [`sst bind`](packages/sst.md#sst-bind) CLI to bind the resources to your tests.

```bash
sst bind "vitest run"
```

This allows the [`sst/node`](clients/index.md) helper library to work as if it was running inside a Lambda function.

[Read more about testing](testing.md) and [learn about the `sst bind` CLI](testing.md#how-sst-bind-works).

---

### Permissions

When a resource is bound to a Lambda function, the permissions to access that resource are automatically granted to the function.

```ts
api.bind([bucket]);
```

Here, by binding the `bucket` to the `api`, the API routes are able to perform file download, upload, delete, and other actions against the bucket.

<details>
<summary>Behind the scenes</summary>

An IAM policy is added to the Lambda function's role, allowing it to perform `s3:*` actions on the S3 bucket's ARN.

The IAM policy statement looks like:

```yml
{
  "Action": "s3:*",
  "Resource": ["arn:aws:s3:::{BUCKET_NAME}", "arn:aws:s3:::{BUCKET_NAME}/*"],
  "Effect": "Allow",
}
```

</details>

---

### Construct support

Resource Binding works across all [SST constructs](constructs/index.md). Here are a few more examples.

- Getting the Next.js URL

  ```ts
  import { NextjsSite } from "sst/node/site";

  NextjsSite.myFrontend.url;
  ```

- DynamoDB table name

  ```ts
  import { Table } from "sst/node/table";

  Table.myTable.tableName;
  ```

- RDS cluster data

  ```ts
  import { RDS } from "sst/node/rds";

  RDS.myDB.clusterArn;
  RDS.myDB.secretArn;
  RDS.myDB.defaultDatabaseName;
  ```

See the [full list of helpers](clients/index.md).

---

## Binding other resources

So far we've seen how Resource Binding allows your functions to access values from other SST constructs. But there are 2 other types of values you might want to access in your functions.

1. Secrets, because you can't define the value of the secrets in your functions.
2. Values from non-SST constructs, for example static values or values from CDK constructs.

For these you can use [`Config`](config.md). Here are a couple of examples.

---

#### Binding secrets

To bind a secret to our function, start by creating a `Config.Secret` construct.

```ts
const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
```

And continuing with our example, bind it to the `api`.

```ts
api.bind([STRIPE_KEY]);
```

Now set the secret value using the SST CLI.

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

And access the value in the function.

```ts
import { Config } from "sst/node/config";

Config.STRIPE_KEY;
```

You can [read more about secrets](config.md#secrets).

---

#### Binding CDK resources

Assuming you have an ECS cluster in your app and you need to pass the cluster name to your function.

Since SST doesn't have a construct for ECS, create a `Config.Parameter` construct with the cluster name being the value.

```ts
const cluster = new ecs.Cluster(stack, "myCluster");

const MY_CLUSTER_NAME = new Config.Parameter(stack, "MY_CLUSTER_NAME", {
  value: cluster.clusterName,
});
```

Then bind it to the `api` from our example.

```ts
api.bind([MY_CLUSTER_NAME]);
```

And you can access the value in your function.

```ts
import { Config } from "sst/node/config";

Config.MY_CLUSTER_NAME;
```

---

## How it works

When a resource is bound to a Lambda function, the resource values are stored as environment variables for the function. In our example, the bucket name is stored as a Lambda environment variable named `SST_Bucket_bucketName_myBucket`.

At runtime, the `sst/node/bucket` package reads the value `process.env.SST_Bucket_bucketName_MyBucket` and makes it accessible via `Bucket.myBucket.bucketName`.

SST also stores a copy of the bucket name in [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html). In this case, an SSM parameter of the type `String` is created with the name `/sst/{appName}/{stageName}/Bucket/MyBucket/bucketName`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage. The parameter value is the name of the bucket stored in plain text.

Storing the bucket name in SSM might seem redundant. But it provides a convenient way to fetch all the bound resources in your application. This can be extremely useful for testing. This isn't possible when using Lambda environment variables and [we are going to see why](#resource-binding-or-lambda-environment-variables).

---

#### Binding sensitive values

When binding resources that contain sensitive values, placeholders are stored in the Lambda environment variables. The actual values are stored inside SSM. At runtime, the values are fetched from SSM when the Lambda container first boots up. And the values are cached for subsequent invocations. This is similar to how [`Config.Secret`](config.md#secrets) works.

---

## Cost

Resource Binding values are stored in AWS SSM with the _Standard Parameter type_ and _Standard Throughput_. This makes AWS SSM [free to use](https://aws.amazon.com/systems-manager/pricing/) in your SST apps. However when storing a `Config.Secret` the value is encrypted by AWS KMS. These are retrieved at runtime in your Lambda functions when it starts up. AWS KMS has a [free tier](https://aws.amazon.com/kms/pricing/#Free_tier) of 20,000 API calls per month. And it costs $0.03 for every 10,000 subsequent API calls. This is worth keeping in mind as these secrets are fetched per Lambda function cold start.

## FAQ

Here are some frequently asked questions about Resource Binding.

---

### Resource Binding or Lambda environment variables?

Prior to Resource Binding, people used Lambda environment variables to pass information to their functions.

Aside from the lack of typesafety and error handling, Lambda environment variables have a few drawbacks. Imagine you have a Lambda function that looks like this.

```ts title="services/users/updated.ts"
export const handler = async () => {
  if (process.env.TOPIC_NAME !== "UserUpdated") {
    return;
  }

  // ...
};
```

Where `TOPIC_NAME` is stored as a Lambda environment variable. You'll need to handle the following:

1. When testing this function, locally or in your CI, you need to figure out the value for `TOPIC_NAME` and set it as an environment variable.

2. In addition, imagine you have another function that also has a `TOPIC_NAME` Lambda environment variable, but with a different value.

   ```ts title="services/billing/charged.ts"
   export const handler = async () => {
     if (process.env.TOPIC_NAME !== "InvoiceCharged") {
       return;
     }

     // ...
   };
   ```

   What should the `TOPIC_NAME` be in your tests?

With Resource Binding, the value for the topic name is also stored in SSM. When running tests, SST can automatically fetch this from SSM using the `sst bind` CLI.

---

### Does this make my Lambda functions slower?

No. The resource values are stored as environment variables for the function. At runtime, reading from environment variables is instantaneous.

For sensitive values, the values are stored in AWS SSM. When the Lambda container first boots up, the values are fetched from SSM and are cached for subsequent invocations.

---

### What if I'm not using Node.js runtime?

For non-Node.js runtimes, you can continue to use Lambda environment variables.

If you want to use Resource Binding, you would need to read the bound values from the Lambda environment variable and AWS SSM directly. Refer to the [`sst/node`](clients/index.md) package to see how it is done in Node.js.
