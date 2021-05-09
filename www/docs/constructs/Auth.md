---
description: "Docs for the sst.Auth construct in the @serverless-stack/resources package"
---

The `Auth` construct is a higher level CDK construct that makes it easy to configure a [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) and [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). Also, allows setting up Auth0, Facebook, Google, Twitter, Apple, and Amazon as authentication providers.

## Initializer

```ts
new Auth(scope: Construct, id: string, props: AuthProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`AuthProps`](#authprops)

## Examples

### Allowing users to sign in using User Pool

```js
import { Auth } from "@serverless-stack/resources";

new Auth(this, "Auth", {
  cognito: true,
});
```

### Allowing users to sign in with their email or phone number

```js
new Auth(this, "Auth", {
  cognito: {
    userPool: {
      signInAliases: { email: true, phone: true },
    },
  },
});
```

### Configuring UserPool triggers

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

### Specifying function props for all the triggers

```js
new Auth(this, "Auth", {
  cognito: {
    defaultFunctionProps: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
    triggers: {
      preAuthentication: "src/preAuthentication.main",
      postAuthentication: "src/postAuthentication.main",
    },
  },
});
```

### Using the full config for a trigger

If you wanted to configure each Lambda function separately, you can pass in the [`FunctionProps`](Function.md#functionprops).

```js
new Auth(this, "Auth", {
  cognito: {
    triggers: {
      preAuthentication: {
        handler: "src/preAuthentication.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
      postAuthentication: "src/postAuthentication.main",
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `FunctionProps` per trigger. The `function` will just override the `defaultFunctionProps`. Except for the `environment` and the `permissions` properties, that will be merged.

```js
new Auth(this, "Auth", {
  cognito: {
    defaultFunctionProps: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
    triggers: {
      preAuthentication: {
        handler: "src/preAuthentication.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
      postAuthentication: "src/postAuthentication.main",
    },
  },
});
```

So in the above example, the `preAuthentication` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

### Allowing Twitter auth and a User Pool

```js
new Auth(this, "Auth", {
  cognito: true,
  twitter: {
    consumerKey: "gyMbPOiwefr6x63SjIW8NN2d9",
    consumerSecret: "qxld1zic5c2eyahqK3gjGLGQaOTogGfAgGh17MYOIcOUR9l2Nz",
  },
});
```

### Adding all the supported social logins

```js
new Auth(this, "Auth", {
  facebook: { appId: "419718329085014" },
  apple: { servicesId: "com.myapp.client" },
  amazon: { appId: "amzn1.application.24ebe4ee4aef41e5acff038aee2ee65f" },
  google: {
    clientId:
      "38017095028-abcdjaaaidbgt3kfhuoh3n5ts08vodt3.apps.googleusercontent.com",
  },
});
```

### Allowing users to login using Auth0

```js
new Auth(this, "Auth", {
  auth0: {
    domain: "https://myorg.us.auth0.com",
    clientId: "UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif",
  },
});
```

### Attaching permissions for authenticated users

```js {7-13}
import * as iam from "@aws-cdk/aws-iam";

const auth = new Auth(this, "Auth", {
  cognito: { signInAliases: { email: true } },
});

auth.attachPermissionsForAuthUsers([
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["s3:*"],
    resources: ["*"],
  }),
]);
```

### Attaching permissions for unauthenticated users

```js {7-13}
import * as iam from "@aws-cdk/aws-iam";

const auth = new Auth(this, "Auth", {
  cognito: { signInAliases: { email: true } },
});

auth.attachPermissionsForUnauthUsers([
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["s3:*"],
    resources: ["*"],
  }),
]);
```

### Upgrading to v0.12.0

The v0.12.0 release of the Auth construct includes a small breaking change. You might be impacted by this change if:

- You are currently using any version `< v0.12.0`
- And using Cognito as the authentication provider

#### Using `signInAliases`

If you are configuring the `signInAliases` like so:

```js
new Auth(this, "Auth", {
  cognito: {
    signInAliases: { email: true, phone: true },
  },
});
```

Change it to:

```js
new Auth(this, "Auth", {
  cognito: {
    userPool: {
      signInAliases: { email: true, phone: true },
    },
  },
});
```

Note the `userPool` prop is expected as a part of the `cognito` prop.

#### Using cognitoUserPool and cognitoUserPoolClient

If you are creating the `UserPool` and the `UserPoolClient` manually like this:

```js
import * as cognito from "@aws-cdk/aws-cognito";

const userPool = new cognito.UserPool(this, "UserPool", {
  userPoolName: "my-user-pool",
  signInAliases: { email: true, phone: true },
});
const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
  userPool,
  disableOAuth: true,
});

new Auth(this, "Auth", {
  cognitoUserPool: userPool,
  cognitoUserPoolClient: userPoolClient,
});
```

Change it to:

```js
import * as cognito from "@aws-cdk/aws-cognito";

const userPool = new cognito.UserPool(this, "UserPool", {
  userPoolName: "my-user-pool",
  signInAliases: { email: true, phone: true },
});
const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
  userPool,
  disableOAuth: true,
});

new Auth(this, "Auth", {
  cognito: {
    userPool,
    userPoolClient,
  },
});
```

Read more about the [`AuthCognitoProps`](#authcognitoprops) below.

## Properties

An instance of `Auth` contains the following properties.

### cognitoCfnIdentityPool

_Type_ : [`cdk.aws-cognito.CfnIdentityPool`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.CfnIdentityPool.html)

The internally created CDK `CfnIdentityPool` instance.

### cognitoUserPool?

_Type_ : [`cdk.aws-cognito.UserPool`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPool.html)

The internally created CDK `UserPool` instance. Not available if only social logins are used.

### cognitoUserPoolClient?

_Type_ : [`cdk.aws-cognito.UserPoolClient`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPoolClient.html)

The internally created CDK `UserPoolClient` instance. Not available if only social logins are used.

### iamAuthRole

_Type_ : [`cdk.aws-iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)

The internally created CDK IAM `Role` instance for the authenticated users of the Identity Pool.

### iamUnauthRole

_Type_ : [`cdk.aws-iam.Role`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-iam.Role.html)

The internally created CDK IAM `Role` instance for the unauthenticated users of the Identity Pool.

## Methods

An instance of `Auth` contains the following methods.

### attachPermissionsForAuthUsers

```ts
attachPermissionsForAuthUsers(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to [IAM role used for authenticated users](#iamauthrole). This dictates which resources an authenticated user has access to.

Follows the same format as [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsForUnauthUsers

```ts
attachPermissionsForUnauthUsers(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to [IAM role used for unauthenticated users](#iamunauthrole). This dictates which resources an unauthenticated user has access to.

Follows the same format as [`Function.attachPermissions`](Function.md#attachpermissions).

## AuthProps

### cognito?

_Type_ : [`AuthCognitoProps`](#authcognitoprops)

The [props](#authcognitoprops) that'll be used to configure a Cognito User Pool.

### apple?

_Type_ : [`AuthAppleProps`](#authappleprops)

The [props](#authappleprops) necessary to configure Apple as an authentication provider for the Identity Pool.

### auth0?

_Type_ : [`AuthAuth0Props`](#authauth0props)

The [props](#authauth0props) necessary to configure Auth0 as an authentication provider for the Identity Pool.

### google?

_Type_ : [`AuthGoogleProps`](#authgoogleprops)

The [props](#authgoogleprops) necessary to configure Google as an authentication provider for the Identity Pool.

### facebook?

_Type_ : [`AuthFacebookProps`](#authfacebookprops)

The [props](#authfacebookprops) necessary to configure Facebook as an authentication provider for the Identity Pool.

### twitter?

_Type_ : [`AuthTwitterProps`](#authtwitterprops)

The [props](#authtwitterprops) necessary to configure Twitter as an authentication provider for the Identity Pool.

### amazon?

_Type_ : [`AuthAmazonProps`](#authamazonprops)

The [props](#authamazonprops) necessary to configure Amazon as an authentication provider for the Identity Pool.

### identityPool?

_Type_ : [`AuthCdkCfnIdentityPoolProps`](#authcdkcfnidentitypoolprops)

The [props](#authcdkcfnidentitypoolprops) that'll be used to configure the Cognito Identity Pool.

## AuthCognitoProps

### userPool?

_Type_ : `cdk.aws-cognito.UserPoolProps | cdk.aws-cognito.UserPool`

Optionally, pass in an instance of the CDK [`cdk.aws-cognito.UserPoolProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPoolProps.html) or [`cdk.aws-cognito.UserPool`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPool.html). This will override the default settings this construct uses to create the CDK `UserPool` internally.

:::caution
You cannot change some of the User Pool properties once the it has been created.
:::

For example, [`SignInAliases`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.SignInAliases.html) cannot be changed after the User Pool has been created.

The different aliases a user can use to sign in to our application for our User Pool. For example, you might want a user to be able to sign in with their email or username. Or with their phone number.

There are two ways of setting this up.

1. User signs up with username and signs in with username or alias

   A user signs up with a username. In addition to the username, you can optionally allow users to sign in with one or more of the following aliases:

   Note that, the _username_ that Cognito refers to, is an internally used _user id_. So in practice, you'll ask a user to create a new username, this is called the _preferred username_ by Cognito.

   - A verified email address
   - A verified phone number
   - A preferred username

   These aliases can be changed after the user signs up.

   To use this option, set the `userPool` prop to:

   ```js
   {
     signInAliases: {
       username: true,
       email: true,
       phone: true,
       preferredUsername: true,
     }
   }
   ```

   [Read more on this over on the AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases-settings).

2. User signs up and signs in with email or phone number instead of username

   A user signs up with an email address or phone number as their username. You can choose whether to allow sign-up with only email addresses, only phone numbers, or either one.

   Note that, the email or phone number that gets set as a username needs to be unique. This is because when Cognito refers to the _username_, it really refers to an internally used _user id_.

   In addition, if a user signs up with an email address, they can only change it to another email address and not a phone number. The same applies if they sign up with a phone number. It cannot be changed to an email.

   To use this option, set the `userPool` prop to:

   ```js
   {
     signInAliases: {
       email: true,
       phone: true,
     }
   }
   ```

   [Read more on this over on the AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases-settings-option-2).

### userPoolClient?

_Type_ : `cdk.aws-cognito.UserPoolClientOptions | cdk.aws-cognito.UserPoolClient`

Optionally, pass in an instance of the CDK [`cdk.aws-cognito.UserPoolClientOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPoolClientOptions.html) or [`cdk.aws-cognito.UserPoolClient`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.UserPoolClient.html). This will override the default settings this construct uses to create the CDK `UserPoolClient` internally.

### triggers?

_Type_ : [AuthUserPoolTriggers](#authuserpooltriggers), _defaults to no triggers_

The triggers for the User Pool. Takes an associative array, with the key being the trigger type and the value is a [`FunctionDefinition`](Function.md#functiondefinition).

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions for the triggers. These default values are overridden by the function props for each trigger. Except for the `environment` and the `permissions` properties, that will be merged.

## AuthAuth0Props

### domain

_Type_ : `string`

The Domain for your Auth0 app.

### clientId

_Type_ : `string`

The Client ID for your Auth0 app.

## AuthAppleProps

### servicesId

_Type_ : `string`

The Services id of your Apple app.

## AuthGoogleProps

### clientId

_Type_ : `string`

The client id of your Google app.

## AuthFacebookProps

### appId

_Type_ : `string`

The id of your Facebook app.

## AuthTwitterProps

### consumerKey

_Type_ : `string`

The Consumer key for your Twitter app.

### consumerSecret

_Type_ : `string`

The Consumer secret key for your Twitter app.

## AuthAmazonProps

### appId

_Type_ : `string`

The id of your Amazon app.

## AuthUserPoolTriggers

### createAuthChallenge?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

Creates an authentication challenge.

### customMessage?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

A custom Message AWS Lambda trigger.

### defineAuthChallenge?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

Defines the authentication challenge.

### postAuthentication?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

A post-authentication AWS Lambda trigger.

### postConfirmation?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

A post-confirmation AWS Lambda trigger.

### preAuthentication?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

A pre-authentication AWS Lambda trigger.

### preSignUp?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

A pre-registration AWS Lambda trigger.

### preTokenGeneration?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

A pre-token-generation AWS Lambda trigger.

### userMigration?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

A user-migration AWS Lambda trigger.

### verifyAuthChallengeResponse?

_Type_: [`FunctionDefinition`](Function.md#functiondefinition)

Verifies the authentication challenge response.

## AuthCdkCfnIdentityPoolProps

`AuthCdkCfnIdentityPoolProps` extends [`cdk.aws-cognito.CfnIdentityPoolProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cognito.CfnIdentityPoolProps.html) with the exception that the `allowUnauthenticatedIdentities` fields is **optional**, and defaults to `true`.

You can use `AuthCdkCfnIdentityPoolProps` to configure the other Identity Pool properties.
