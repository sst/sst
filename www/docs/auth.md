---
title: Auth
description: "Learn to manage users and authentication in your SST (SST) app."
---

You can handle authentication in your SST app using AWS's [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) or via a third party auth provider like [Auth0](https://auth0.com/).

Let's look at them both in detail.

## Cognito User Pool

SST's [`Auth`](constructs/Auth.md) construct makes it easy to manage your users using [AWS Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html). It provides a simple way to handle sign up, login, logout, and to manage users in your web and mobile apps.

```js
import { Auth } from "@serverless-stack/resources";

const auth = new Auth(stack, "Auth");
```

The [SST Console](console.md) also gives you a way to manage your User Pools.

![SST Console Cognito tab](/img/console/sst-console-cognito-tab.png)

You can create new users and delete existing users.

### Accessing APIs

Cognito User Pool supports [JSON web tokens (JWT)](https://en.wikipedia.org/wiki/JSON_Web_Token) that you can use to authorize access to your API.

```js
new Api(stack, "Api", {
  authorizers: {
    pool: {
      type: "user_pool",
      userPool: {
        id: auth.userPoolId,
      },
    },
  },
  defaults: {
    authorizer: "pool",
  },
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::tip Example

Here's a detailed tutorial on how to add JWT authentication with Cognito to your API.

[READ TUTORIAL](https://sst.dev/examples/how-to-add-jwt-authorization-with-cognito-user-pool-to-a-serverless-api.html)

:::

### Accessing S3 Buckets

Your users won't have direct access to files in your S3 bucket. You'd need to create an API endpoint that generates presigned URLs for them to upload and download.

Here's how the flow works:

1. A user makes a call to the presigned URL API with the S3 file path they want to upload or download.
2. The API makes a call to S3 to generate a presigned URL.
3. The user uploads a file to that URL or downloads from it.

You can read more about [Granting access to S3 with presigned URLs](./storage#granting-access-with-presigned-url)

### Accessing other resources

Normally, you shouldn't need to allow users to directly access other AWS services from the frontend. This includes:

- Fetching data from a database [`Table`](constructs/Table.md)
- Pulling messages from a [`Queue`](constructs/Queue.md)
- Sending events to a [`Topic`](constructs/Topic.md)

But if you want your users to be able to do these directly from your web or mobile app, you can use a [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html) to grant them the necessary permissions.

Cognito Identity Pool is an AWS service that can assign temporary IAM credentials to both authenticated and unauthenticated users in your web or mobile app.

```js
// Create a Table
const table = new Table(stack, "Notes", {
  fields: {
    userId: "string",
    noteId: "string"
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});

// Allow authenticated users to access the table
auth.attachPermissionsForAuthUsers([table]);
```

Note that, if you are using the Cognito Identity Pool, you have the option to also:

- [Grant IAM permissions to APIs](./api.md#cognito-identity-pool) instead of using the JWT token
- [Grant IAM permissions to S3 files](./storage.md#granting-access-with-cognito-identity-pool) without needing to generate a presigned URL

### User Pool triggers

You can use Lambda functions to add authentication challenges, migrate users, and customize verification messages. These can be triggered during User Pool operations like user sign up, confirmation, and sign in.

```js
new Auth(stack, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});
```

You can check out [all the supported User Pool triggers](constructs/Auth.md#authuserpooltriggers).

## Third-party auth providers

You can also use a third-party auth provider like [Auth0](https://auth0.com).

:::tip

If you are using a third-party auth provider, you don't need to use the [Auth](constructs/Auth.md) construct. You can directly authorize access to APIs and S3 Buckets.

:::

However if you wanted your users to be able to access other AWS resources while using a third party auth provider; you'll need to use a [Cognito Identity Pool](https://en.wikipedia.org/wiki/JSON_Web_Token) via the [`Auth`](constructs/Auth.md) construct. It'll assign temporary IAM credentials to your users. Read more about [how to access other resources](#accessing-other-resources-1) below.

### Accessing APIs

Set the third-party JWT authorizer in the [`Api`](constructs/Api.md) construct to grant access to your APIs.

```js
new Api(stack, "Api", {
  authorizers: {
    auth0: {
      type: "jwt",
      jwt: {
        audience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
        issuer: "https://myorg.us.auth0.com",
      },
    },
  },
  defaults: {
    authorizer: "auth0",
  },
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::tip Example

Here's a detailed tutorial on how to add JWT authentication with Auth0.

[READ TUTORIAL](https://sst.dev/examples/how-to-add-jwt-authorization-with-auth0-to-a-serverless-api.html)

:::

### Accessing S3 Buckets

You'll need to use presigned URLs to upload files to your S3 bucket. This is similar to the [Cognito User Pool flow](#accessing-s3-buckets) outlined above.

### Accessing other resources

As mentioned above; if you want your users to be able to access other AWS resources, you can use the [`Auth`](constructs/Auth.md) construct to create a [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html). And use it to assign temporarily IAM credentials for your users to access other AWS services. The setup is similar to the [Cognito User Pool setup](#accessing-other-resources) above.

```js
const auth = new Auth(stack, "Auth", {
  identityPoolFederation: {
    auth0: {
      domain: "https://myorg.us.auth0.com",
      clientId: "UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif",
    },
  },
});

// Allow authenticated users to access the table
auth.attachPermissionsForAuthUsers([table]);
```

:::tip Example

Follow this tutorial on how to authenticate a serverless API with Auth0.

[READ TUTORIAL](https://sst.dev/examples/how-to-add-auth0-authentication-to-a-serverless-api.html)

:::
