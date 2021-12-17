---
title: Authentication 🟢
description: "How to manage users in your SST app"
---

## User Management

SST's [Auth](../constructs/Auth.md) construct makes it easy to manage your users using [AWS Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html). It provides a simple way to handle sign up, log in, log out, and manage users in your apps and websites.

```js
import { Auth } from "@serverless-stack/resources";

const auth = new Auth(this, "Auth", {
  cognito: true,
});
```

### Accessing API

Cognito User Pool supports JSON web tokens (JWT) that you can use to authorize the API.

```js
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpUserPoolAuthorizer({
    userPool: auth.cognitoUserPool,
    userPoolClients: [auth.cognitoUserPoolClient],
  }),
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::info Example

This tutorial steps through adding JWT authentication with Cognito.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-add-jwt-authorization-with-cognito-user-pool-to-a-serverless-api.html)

:::

### Accessing S3 file storage

Your users won't have direct access to files in your S3 file storage. You need to create an API endpoint that generates presigned URLs for the file they want to upload.

How it works:
1. A user makes a call to the API with the S3 file path they want to upload to.
2. The API makes a call to S3 to generate a signed URL.
3. The user uploads the file to the signed URL.

Read more about [Granting access with presigned URL](./storage#granting-access-with-presigned-url)

### Accessing other resoruces

Normally, you shouldn't need to allow users to access other AWS services, such as:
- Fetching data from a database Table.
- Pulling messages from a Queue.
- Sending events to a Topic.

But if you want your users to be able to do these directly from the web or mobile app, you can use [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html) to grant them the necessary permissions.

Cognito Identity Pool is an AWS service that can assign temporary IAM credentials to both authenticated and unauthenticated users in your web or mobile app.

```js
// Create a Table
const table = new Table(this, "Notes", {
  fields: {
    userId: TableFieldType.STRING,
    noteId: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "noteId", sortKey: "userId" },
});

// Allow authenticated users to access the table
auth.attachPermissionsForAuthUsers([table]);
```

Note that if you are using Cognito Identity Pool, you have the option to also:
- [Grant IAM permissions to APIs](./api#cognito-identity-pool) instead of using the JWT token.
- [Grant IAM permissions to S3 file storage](./storage#granting-access-with-cognito-identity-pool) without needing to generate a presigned URL.

### User Pool triggers

You can create an AWS Lambda function and then trigger that function during user pool operations such as user sign-up, confirmation, and sign-in with a Lambda trigger. You can add authentication challenges, migrate users, and customize verification messages.

```js
new Auth(this, "Auth", {
  cognito: {
    triggers: {
      preAuthentication: "src/preAuthentication.main",
      postAuthentication: "src/postAuthentication.main",
    },
  },
});
```

Read more about [all supported triggers](../constructs/Auth#authuserpooltriggers).

## Third-party auth provider

You can also use a third-party auth provider like [Auth0](https://auth0.com)

:::tip

You don't need to use the [Auth](../constructs/Auth.md) construct to authorize the API and file upload. It is only required if you want to use Cognito Identity Pool to assign temporary IAM credentials to your users. See [Accessing other resources](#accessing-other-resoruces-1).

:::

### Accessing API

Use the third-party issued JSON web tokens (JWT) to authorize the API.

```js
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpJwtAuthorizer({
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
    jwtIssuer: "https://myorg.us.auth0.com",
  }),
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::info Example

This tutorial steps through adding JWT authentication with Auth0.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-add-jwt-authorization-with-auth0-to-a-serverless-api.html)

:::

### Accessing S3 file storage

You need to use presigned URLs to upload files to your S3 file storage similar to the [Cognito User Pool flow](#accessing-s3-file-storage).

### Accessing other resoruces

You can use the [Auth](../constructs/Auth.md) construct to create a [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html). And use it to assign temporarily IAM credentials for your users to access other AWS services. The setup is similar to the [Cognito User Pool setup](#accessing-other-resources) above.

```js
new Auth(this, "Auth", {
  auth0: {
    domain: "https://myorg.us.auth0.com",
    clientId: "UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif",
  },
});
```

:::info Example

This tutorial steps through authenticating a serverless API with Auth0.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-add-auth0-authentication-to-a-serverless-api.html)

:::
