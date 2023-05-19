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

**Resource Binding** allows you to connect your infrastructure to your frontends and functions. This is done in two steps:

1. Bind a resource to your frontend or API through the `bind` prop.
2. Use the [`sst/node`](clients/index.md) package to access the resource in your function.

---

## Quick start

To see how Resource Binding works, we are going to create an S3 bucket and bind it to a Next.js frontend.

To follow along, you can create a new SST app by running `npx create-sst@latest`. Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/standard-nextjs) that's based on the same template.

1. To create a new bucket, open up `stacks/Default.ts` and add a [`Bucket`](constructs/Bucket.md) construct below the [`NextjsSite`](constructs/NextjsSite.md).

   ```ts title="stacks/Default.ts"
   const bucket = new Bucket(stack, "public");
   ```

   You'll also need to import `Bucket` at the top.

   ```ts
   import { Bucket } from "sst/constructs";
   ```

2. Then, bind the `bucket` to the `site`.

   ```diff title="stacks/Default.ts"
   const site = new NextjsSite(stack, "site", {
     path: "packages/next",
   + bind: [bucket],
   });
   ```

3. Now we can access the bucket's name in our frontend using the [`Bucket`](clients/bucket.md) helper. Add this to `packages/next/pages/index.ts` to generate a presigned URL.

   ```ts title="packages/next/pages/index.ts" {10}
   import crypto from "crypto";
   import { Bucket } from "sst/node/bucket";
   import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
   import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

   export async function getServerSideProps() {
     const command = new PutObjectCommand({
       ACL: "public-read",
       Key: crypto.randomUUID(),
       Bucket: Bucket.public.bucketName,
     });
     const url = await getSignedUrl(new S3Client({}), command);

     return { props: { url } };
   }
   ```

   And install the AWS SDK for this example.

   ```bash
   npm install --save @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

   That's it!

:::tip
Since we are dealing with sensitive info, resource binding is only supported in the frontend's server side functions. To access these on the client side, [check out the section below](#client-side-environment-variables).
:::

While we are using the [`NextjsSite`](constructs/NextjsSite.md) in this example, resource binding is supported in all SST functions and SSR frontends. With the exception of the [`RemixSite`](constructs/RemixSite.md), since Remix does not fully support top-level await yet.

---

## Features

Let's take a look at some of the key features of Resource Binding, and how it makes building apps fun and easy again.

---

### Typesafety

In the above example, the `Bucket` object that's imported from `sst/node/bucket` is typesafe. Your editor should be able to autocomplete the bucket name `public`, as well as its property `bucketName`.

<details>
<summary>Behind the scenes</summary>

Let's take a look at how this is all wired up.

1. First, the `sst/node/table` package predefines an interface.

   ```ts
   export interface BucketResources {}
   ```

2. When SST builds the app, it generates a type file and adds the bucket name to the `BucketResources` interface.

   ```ts title=".sst/types/index.ts"
   import "sst/node/bucket";
   declare module "sst/node/bucket" {
     export interface BucketResources {
       public: {
         bucketName: string;
       };
     }
   }
   ```

3. So when the `Bucket` object is imported from `sst/node/bucket`, it has the type `BucketResources`.

</details>

---

### Error handling

If you reference a resource that doesn't exist in your SST app, or hasn't been bound to the frontend, you'll get a runtime error.

For example, if you forget to bind the `bucket` to the `site`, you'll get the following error when the function is invoked.

```
Cannot use Bucket.public. Please make sure it is bound to this function.
```

---

### Testing

When testing your code, you can use the [`sst bind`](packages/sst.md#sst-bind) CLI to bind the resources to your tests.

```bash
sst bind vitest run
```

This allows the [`sst/node`](clients/index.md) helper library to work as if it was running inside a Lambda function.

[Read more about testing](testing.md) and [learn about the `sst bind` CLI](testing.md#how-sst-bind-works).

---

### Permissions

When a resource is bound to a Lambda function, the permissions to access that resource are automatically granted to the function.

```ts
site.bind([bucket]);
```

Here, by binding the `bucket` to the `site`, the frontend is able to perform file download, upload, delete, and other actions against the bucket.

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

So far we've seen how Resource Binding allows your frontend to access values from other SST constructs. But there are 2 other types of values you might want to access in your frontend.

1. Secrets, because you can't define the value of the secrets in your frontend.
2. Values from non-SST constructs, for example static values or values from CDK constructs.

For these you can use [`Config`](config.md). Here are a couple of examples.

---

#### Binding secrets

To bind a secret to our frontend, start by creating a `Config.Secret` construct.

```ts
const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
```

And continuing with our example, bind it to the `site`.

```diff
const site = new NextjsSite(stack, "site", {
  path: "packages/next",
+ bind: [STRIPE_KEY],
});
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

Then bind it to the `site` from our example.

```diff
const site = new NextjsSite(stack, "site", {
  path: "packages/next",
+ bind: [MY_CLUSTER_NAME],
});
```

And you can access the value in your function.

```ts
import { Config } from "sst/node/config";

Config.MY_CLUSTER_NAME;
```

---

## Client side access

So far we've looked at how you can use the [`sst/node`](clients/index.md) client in your functions or in your frontend's server side functions. But there might be cases where you want to access something on the client side.

To do this, you can pass props from the server functions to the client side. Using the example from above.

```ts {4}
export async function getServerSideProps() {
  return {
    props: {
      bucketName: Bucket.public.bucketName,
    },
  };
}
```

:::caution
Be careful not to pass any secrets or sensitive info to the client.
:::

We can read the bucket name in the `getServerSideProps` function and pass it as a prop to our component.

```ts {1}
export default function Home({ bucketName }: { bucketName: string }) {
  // Render component
}
```

Alternatively, you can set directly set client side environment variables.

---

#### Client side environment variables

However, Frontends (like Next.js, Remix, etc.) can read from an environment variable purely on the client side. SST supports setting these client side environment variables as well.

This is useful if you have a completely static frontend and you want to pass in the outputs of other constructs in your SST app. Let's look at how.

Imagine you have an S3 bucket created using the [`Bucket`](constructs/Bucket.md) construct, and you want to access the name of the bucket in your client side code. You can use the `environment` property in your [`NextjsSite`](constructs/NextjsSite.md) construct.

```ts {4-6}
const bucket = new Bucket(stack, "Bucket");

new NextjsSite(stack, "Site", {
  environment: {
    NEXT_PUBLIC_BUCKET_NAME: bucket.bucketName,
  },
});
```

Now you can access the bucket's name in your client side code.

```ts
console.log(process.env.NEXT_PUBLIC_BUCKET_NAME);
```

In Next.js, only environment variables prefixed with `NEXT_PUBLIC_` are available in your client side code. [Read more about using environment variables](https://nextjs.org/docs/basic-features/environment-variables#exposing-environment-variables-to-the-browser).

---

## How it works

When a resource is bound to a Lambda function, the resource values are stored as environment variables for the function. In our example, the bucket name is stored as a Lambda environment variable named `SST_Bucket_bucketName_myBucket`.

At runtime, the `sst/node/bucket` package uses [top-level await](https://v8.dev/features/top-level-await) to read the value `process.env.SST_Bucket_bucketName_myBucket` and make it accessible via `Bucket.myBucket.bucketName`.

SST also stores a copy of the bucket name in [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html). In this case, an SSM parameter of the type `String` is created with the name `/sst/{appName}/{stageName}/Bucket/myBucket/bucketName`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage. The parameter value is the name of the bucket stored in plain text.

Storing the bucket name in SSM might seem redundant. But it provides a convenient way to fetch all the bound resources in your application. This can be extremely useful for testing. This isn't possible when using Lambda environment variables and [we are going to see why](#resource-binding-or-lambda-environment-variables).

---

#### Binding sensitive values

When binding resources that contain sensitive values, placeholders are stored in the Lambda environment variables. The actual values are stored inside SSM. At runtime, the values are fetched from SSM when the Lambda container first boots up using top-level await. And the values are cached for subsequent invocations. This is similar to how [`Config.Secret`](config.md#secrets) works.

---

#### Typesafety

When running `sst build`, `sst deploy`, or `sst dev`, types are generated for the defined resources and `Config` properties in the `.sst` directory.

:::tip
If you are using one of our starters, this should be done automatically for you.
:::

To use these types, place the following `sst-env.d.ts` file in any package that needs the types.

```js title="sst-env.d.ts"
/// <reference path="../.sst/types/index.ts" />
```

Make sure you specify the path to the `.sst` directory correctly. With this in place, your IDE should recognize the generated types and autocomplete them.

---

#### Client side environment variables

On `sst deploy` client side environment variables will first be replaced by placeholder values, ie. `{{ NEXT_PUBLIC_BUCKET_NAME }}`, when building the Next.js app. And after the S3 bucket has been created, the placeholders in the HTML and JS files will then be replaced with the actual values.

:::caution
Since the actual values are determined at deploy time, you should not rely on the values at build time. For example, you cannot reference `process.env.NEXT_PUBLIC_BUCKET_NAME` inside `getStaticProps()` at build time.

There are a couple of workarounds:

- Hardcode the bucket name
- Read the bucket name dynamically at build time (ie. from an SSM value)
- Use [fallback pages](https://nextjs.org/docs/basic-features/data-fetching#fallback-pages) to generate the page on the fly

:::

Note that since edge functions don't support Lambda environment variables, the above token replace method is also used.

---

#### Working locally

Resource binding works a little differently for the frontend sites because SST does not run them locally. Instead you wrap your frontend local dev command with `sst bind`. For example, you run `sst bind next dev` for Next.js.

```json title="package.json" {2}
"scripts": {
  "dev": "sst bind next dev",
  "build": "next build",
  "start": "next start"
},
```

Note that, `sst bind` only works if the Next.js app is located inside the SST app or inside one of its subdirectories. For example:

```
/
  sst.config.ts
  my-next-app/
```

There are a couple of things happening behind the scenes here:

1. The `sst dev` command generates stores all the bound resources and environment variables in your AWS account as something called the _stack metadata_.
2. The `sst bind` CLI loads these environment variables and sets them for your frontend's local development environment. It also gets an IAM role similar to the one that your SSR function will have when deployed.
3. When you call `sst/node` in your frontend, it'll use the IAM role to fetch the resources you are trying to access from the _stack metadata_.

---

## Cost

Resource Binding values are stored in AWS SSM with the _Standard Parameter type_ and _Standard Throughput_. This makes AWS SSM [free to use](https://aws.amazon.com/systems-manager/pricing/) in your SST apps. However when storing a `Config.Secret` the value is encrypted by AWS KMS. These are retrieved at runtime in your Lambda functions when it starts up. AWS KMS has a [free tier](https://aws.amazon.com/kms/pricing/#Free_tier) of 20,000 API calls per month. And it costs $0.03 for every 10,000 subsequent API calls. This is worth keeping in mind as these secrets are fetched per Lambda function cold start.

---

## FAQ

Here are some frequently asked questions about Resource Binding.

---

### Resource Binding or Lambda environment variables?

Prior to Resource Binding, people used Lambda environment variables to pass information to their functions.

Aside from the lack of typesafety and error handling, Lambda environment variables have a few drawbacks. Imagine you have a Lambda function that looks like this.

```ts title="packages/functions/src/updated.ts"
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

   ```ts title="packages/functions/src/charged.ts"
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
