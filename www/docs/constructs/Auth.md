---
description: "Docs for the sst.Auth construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Auth` construct is a higher level CDK construct that makes it easy to configure a [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) and [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). Also, allows setting up Auth0, Facebook, Google, Twitter, Apple, and Amazon as authentication providers.

## Constructor
```ts
new Auth(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[AuthProps](#authprops)</span>

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

### Configuring login

You can configure how a user can sign in to our application for our User Pool. For example, you might want a user to be able to sign in with their email or username. Or with their phone number.

There are two ways of setting this up.

1. User signs up with username and signs in with username or alias

   A user signs up with a username. In addition to the username, you can optionally allow users to sign in with one or more of the following aliases:

   Note that, the _username_ that Cognito refers to, is an internally used _user id_. So in practice, you'll ask a user to create a new username, this is called the _preferred username_ by Cognito.

   - A verified email address
   - A verified phone number
   - A preferred username

   These aliases can be changed after the user signs up.

   To use this option, set the `login` prop to:

   ```js
   new Auth(this, "Auth", {
     login: ["email", "phone", "username", "preferredUsername"]
   });
   ```

   [Read more on this over on the AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases-settings).

2. User signs up and signs in with email or phone number instead of username

   A user signs up with an email address or phone number as their username. You can choose whether to allow sign-up with only email addresses, only phone numbers, or either one.

   Note that, the email or phone number that gets set as a username needs to be unique. This is because when Cognito refers to the _username_, it really refers to an internally used _user id_.

   In addition, if a user signs up with an email address, they can only change it to another email address and not a phone number. The same applies if they sign up with a phone number. It cannot be changed to an email.

   To use this option, set the `login` prop to:

   ```js
   new Auth(this, "Auth", {
     login: ["email", "phone"]
   });
   ```

   [Read more on this over on the AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases-settings-option-2).

### Configuring triggers

The Cognito User Pool can invoke a Lambda function for specific [triggers](#triggers).

#### Adding triggers

```js
new Auth(this, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});
```

#### Specifying function props for all the triggers

```js
new Auth(this, "Auth", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});
```

#### Configuring an individual trigger

Configure each Lambda function separately.

```js
new Auth(this, "Auth", {
  triggers: {
    preAuthentication: {
      handler: "src/preAuthentication.main",
      timeout: 10,
      environment: { bucketName: bucket.bucketName },
      permissions: [bucket],
    },
    postAuthentication: "src/postAuthentication.main",
  },
});
```

Note that, you can set the `defaults.function` while using the `FunctionProps` per trigger. The `function` will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, it will be merged.

```js
new Auth(this, "Auth", {
    defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
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
});
```

So in the above example, the `preAuthentication` function doesn't use the `timeout` that is set in the `defaults.function`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Attaching permissions for all triggers

Allow all the triggers to access S3.

```js {8}
const auth = new Auth(this, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});

auth.attachPermissionsForTriggers(["s3"]);
```

#### Attaching permissions for a specific trigger

Allow one of the triggers to access S3.

```js {8}
const auth = new Auth(this, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});

auth.attachPermissionsForTriggers("preAuthentication", ["s3"]);
```

Here we are referring to the trigger using the trigger key, `preAuthentication`. 

### Identity Pool federation

#### Enabling federation with Auth0

```js
new Auth(this, "Auth", {
  identityPoolFederation: {
    auth0: {
      domain: "https://myorg.us.auth0.com",
      clientId: "UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif",
    },
  },
});
```

#### Enabling federation with Twitter

```js
new Auth(this, "Auth", {
  identityPoolFederation: {
    twitter: {
      consumerKey: "gyMbPOiwefr6x63SjIW8NN2d9",
      consumerSecret: "qxld1zic5c2eyahqK3gjGLGQaOTogGfAgGh17MYOIcOUR9l2Nz",
    },
  },
});
```

#### Enabling federation with multiple social logins

```js
new Auth(this, "Auth", {
  identityPoolFederation: {
    facebook: { appId: "419718329085014" },
    apple: { servicesId: "com.myapp.client" },
    amazon: { appId: "amzn1.application.24ebe4ee4aef41e5acff038aee2ee65f" },
    google: {
      clientId:
        "38017095028-abcdjaaaidbgt3kfhuoh3n5ts08vodt3.apps.googleusercontent.com",
    },
  },
});
```

#### Attaching permissions for authenticated federation identity

```js {3}
const auth = new Auth(this, "Auth");

auth.attachPermissionsForAuthUsers([api, "s3"]);
```

#### Attaching permissions for unauthenticated federation identity

```js {3}
const auth = new Auth(this, "Auth");

auth.attachPermissionsForUnauthUsers([api, "s3"]);
```

### Advanced examples

#### Configuring attributes

```js
import {
  StringAttribute,
  NumberAttribute,
  BooleanAttribute,
  DateTimeAttribute,
} from "aws-cdk-lib/aws-cognito";

new Auth(this, "Auth", {
  cdk: {
    userPool: {
      standardAttributes: {
        fullname: { required: true, mutable: false },
        address: { required: false, mutable: true },
      },
      customAttributes: {
        'gameId': new StringAttribute({ minLen: 5, maxLen: 15, mutable: false }),
        'participants': new NumberAttribute({ min: 1, max: 3, mutable: true }),
        'isCompleted': new BooleanAttribute({ mutable: true }),
        'startedAt': new DateTimeAttribute(),
      },
    }
  },
});
```

#### Importing an existing User Pool

Override the internally created CDK `UserPool` and `UserPoolClient` instance.

```js {5-6}
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";

new Auth(this, "Auth", {
  cdk: {
    userPool: UserPool.fromUserPoolId(this, "IUserPool", "pool-id"),
    userPoolClient: UserPoolClient.fromUserPoolClientId(this, "IUserPoolClient", "pool-client-id"),
  },
});
```

#### Sharing Auth across stacks

You can create the Auth construct in one stack, and attach permissions in other stacks. To do this, return the Auth construct from your stack function.

```ts title="stacks/AuthStack.ts"
import { Auth, StackContext } from "@serverless-stack/resources";

export function AuthStack(ctx: StackContext) {
  const auth = new Auth(ctx.stack, "Auth");
  return {
    auth
  }
}
```

Then import the auth construct into another stack with `use` and attach the permissions.

```js {13} title="stacks/ApiStack.ts"
import { Api, Stack } from "@serverless-stack/resources";
import { AuthStack } from "./AuthStack"

export function ApiStack(ctx: StackContext) {
  const { auth } = use(AuthStack)
  const api = new Api(ctx.stack, "Api", {
    routes: {
      "GET  /notes": "src/list.main",
      "POST /notes": "src/create.main",
    },
  });
  auth.attachPermissionsForAuthUsers([api]);
}
```

## AuthProps



### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the triggers in the UserPool. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.



```js
new Auth(stack, "Auth", {
  defaults: {
    function: {
      timeout: 20,
      environment: { topicName: topic.topicName },
      permissions: [topic],
    }
  },
});
```


### identityPoolFederation?

_Type_ : <span class='mono'><span class="mono">boolean</span> | <span class="mono">[AuthCognitoIdentityPoolFederationProps](#authcognitoidentitypoolfederationprops)</span></span>

_Default_ : <span class="mono">Identity Pool created with the User Pool as the authentication provider</span>

Configure the Cognito Identity Pool and its authentication providers.

### login?

_Type_ : <span class='mono'>Array&lt;<span class='mono'><span class="mono">"email"</span> | <span class="mono">"phone"</span> | <span class="mono">"username"</span> | <span class="mono">"preferredUsername"</span></span>&gt;</span>

_Default_ : <span class="mono">`["username"]`</span>

Configure the different ways a user can sign in to our application for our User Pool. For example, you might want a user to be able to sign in with their email or username. Or with their phone number.
:::caution
You cannot change the login property once the User Pool has been created.
:::

### triggers?

_Type_ : <span class="mono">[AuthUserPoolTriggers](#authuserpooltriggers)</span>

_Default_ : <span class="mono">No triggers</span>

Configure triggers for this User Pool



```js
new Auth(stack, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});
```


### cdk.userPool?

_Type_ : <span class='mono'><span class="mono">[UserPoolProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolProps.html)</span> | <span class="mono">[IUserPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPool.html)</span></span>

This allows you to override the default settings this construct uses internally to create the User Pool.

### cdk.userPoolClient?

_Type_ : <span class='mono'><span class="mono">[UserPoolClientOptions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolClientOptions.html)</span> | <span class="mono">[IUserPoolClient](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPoolClient.html)</span></span>

This allows you to override the default settings this construct uses internally to create the User Pool client.


## Properties
An instance of `Auth` has the following properties.
### cognitoIdentityPoolId

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

The id of the internally created `IdentityPool` instance.

### userPoolArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created Cognito User Pool.

### userPoolClientId

_Type_ : <span class="mono">string</span>

The id of the internally created Cognito User Pool client.

### userPoolId

_Type_ : <span class="mono">string</span>

The id of the internally created Cognito User Pool.


### cdk.authRole

_Type_ : <span class="mono">[Role](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)</span>

### cdk.cfnIdentityPool?

_Type_ : <span class="mono">[CfnIdentityPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnIdentityPool.html)</span>

### cdk.unauthRole

_Type_ : <span class="mono">[Role](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.Role.html)</span>

### cdk.userPool

_Type_ : <span class="mono">[IUserPool](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPool.html)</span>

### cdk.userPoolClient

_Type_ : <span class="mono">[IUserPoolClient](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.IUserPoolClient.html)</span>


## Methods
An instance of `Auth` has the following methods.
### attachPermissionsForAuthUsers

```ts
attachPermissionsForAuthUsers(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>
### attachPermissionsForTrigger

```ts
attachPermissionsForTrigger(triggerKey, permissions)
```
_Parameters_
- __triggerKey__ 
- __permissions__ <span class="mono">[Permissions](Permissions)</span>
### attachPermissionsForTriggers

```ts
attachPermissionsForTriggers(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>
### attachPermissionsForUnauthUsers

```ts
attachPermissionsForUnauthUsers(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>
### getFunction

```ts
getFunction(triggerKey)
```
_Parameters_
- __triggerKey__ 
## AuthAppleProps


### servicesId

_Type_ : <span class="mono">string</span>

## AuthAuth0Props


### clientId

_Type_ : <span class="mono">string</span>

### domain

_Type_ : <span class="mono">string</span>

## AuthAmazonProps


### appId

_Type_ : <span class="mono">string</span>

## AuthGoogleProps


### clientId

_Type_ : <span class="mono">string</span>

## AuthTwitterProps


### consumerKey

_Type_ : <span class="mono">string</span>

### consumerSecret

_Type_ : <span class="mono">string</span>

## AuthFacebookProps


### appId

_Type_ : <span class="mono">string</span>

## AuthUserPoolTriggers


### createAuthChallenge?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### customEmailSender?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### customMessage?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### customSmsSender?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### defineAuthChallenge?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### postAuthentication?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### postConfirmation?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### preAuthentication?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### preSignUp?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### preTokenGeneration?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### userMigration?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

### verifyAuthChallengeResponse?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

## AuthCdkCfnIdentityPoolProps


### allowUnauthenticatedIdentities?

_Type_ : <span class="mono">boolean</span>

## AuthCognitoIdentityPoolFederationProps


### amazon?

_Type_ : <span class="mono">[AuthAmazonProps](#authamazonprops)</span>

### apple?

_Type_ : <span class="mono">[AuthAppleProps](#authappleprops)</span>

### auth0?

_Type_ : <span class="mono">[AuthAuth0Props](#authauth0props)</span>

### facebook?

_Type_ : <span class="mono">[AuthFacebookProps](#authfacebookprops)</span>

### google?

_Type_ : <span class="mono">[AuthGoogleProps](#authgoogleprops)</span>

### twitter?

_Type_ : <span class="mono">[AuthTwitterProps](#authtwitterprops)</span>


### cdk.cfnIdentityPool?

_Type_ : <span class="mono">[AuthCdkCfnIdentityPoolProps](#authcdkcfnidentitypoolprops)</span>

