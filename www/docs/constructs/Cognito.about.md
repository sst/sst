import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The `Auth` construct is a higher level CDK construct that makes it easy to configure a [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) and [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). Also, allows setting up Auth0, Facebook, Google, Twitter, Apple, and Amazon as authentication providers.

## Examples

### Using the minimal config

```js
import { Cognito } from "sst/constructs";

new Cognito(stack, "Auth");
```

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
   new Cognito(stack, "Auth", {
     login: ["email", "phone", "username", "preferredUsername"],
   });
   ```

   [Read more on this over on the AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases-settings).

2. User signs up and signs in with email or phone number instead of username

   A user signs up with an email address or phone number as their username. You can choose whether to allow sign-up with only email addresses, only phone numbers, or either one.

   Note that, the email or phone number that gets set as a username needs to be unique. This is because when Cognito refers to the _username_, it really refers to an internally used _user id_.

   In addition, if a user signs up with an email address, they can only change it to another email address and not a phone number. The same applies if they sign up with a phone number. It cannot be changed to an email.

   To use this option, set the `login` prop to:

   ```js
   new Cognito(stack, "Auth", {
     login: ["email", "phone"],
   });
   ```

   [Read more on this over on the AWS docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases-settings-option-2).

### Configuring triggers

The Cognito User Pool can invoke a Lambda function for specific [triggers](#triggers).

#### Adding triggers

```js
new Cognito(stack, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});
```

#### Specifying function props for all the triggers

```js
new Cognito(stack, "Auth", {
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
new Cognito(stack, "Auth", {
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
new Cognito(stack, "Auth", {
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
const auth = new Cognito(stack, "Auth", {
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
const auth = new Cognito(stack, "Auth", {
  triggers: {
    preAuthentication: "src/preAuthentication.main",
    postAuthentication: "src/postAuthentication.main",
  },
});

auth.attachPermissionsForTrigger("preAuthentication", ["s3"]);
```

Here we are referring to the trigger using the trigger key, `preAuthentication`.

### Identity Pool federation

#### Enabling federation with Auth0

```js
new Cognito(stack, "Auth", {
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
new Cognito(stack, "Auth", {
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
new Cognito(stack, "Auth", {
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
const auth = new Cognito(stack, "Auth");

auth.attachPermissionsForAuthUsers(stack, [api, "s3"]);
```

#### Attaching permissions for unauthenticated federation identity

```js {3}
const auth = new Cognito(stack, "Auth");

auth.attachPermissionsForUnauthUsers(stack, [api, "s3"]);
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

new Cognito(stack, "Auth", {
  cdk: {
    userPool: {
      standardAttributes: {
        fullname: { required: true, mutable: false },
        address: { required: false, mutable: true },
      },
      customAttributes: {
        gameId: new StringAttribute({ minLen: 5, maxLen: 15, mutable: false }),
        participants: new NumberAttribute({ min: 1, max: 3, mutable: true }),
        isCompleted: new BooleanAttribute({ mutable: true }),
        startedAt: new DateTimeAttribute(),
      },
    },
  },
});
```

#### Importing an existing User Pool

Override the internally created CDK `UserPool` and `UserPoolClient` instance.

```js {5-6}
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";

new Cognito(stack, "Auth", {
  cdk: {
    userPool: UserPool.fromUserPoolId(stack, "UserPool", "pool-id"),
    userPoolClient: UserPoolClient.fromUserPoolClientId(
      stack,
      "UserPoolClient",
      "pool-client-id"
    ),
  },
});
```

#### Adding additional clients

You can create additional clients for the Cognito user pool.

```js {5-6}
const cognito = new Cognito(stack, "Auth");

cognito.cdk.userPool.addClient("anotherClient", {
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
});
```

#### Sharing Auth across stacks

You can create the Auth construct in one stack, and attach permissions in other stacks. To do this, return the Auth construct from your stack function.

```ts title="stacks/AuthStack.ts"
import { Cognito, StackContext } from "sst/constructs";

export function AuthStack({ stack }: StackContext) {
  const auth = new Cognito(stack, "Auth");
  return {
    auth,
  };
}
```

Then import the auth construct into another stack with `use` and attach the permissions.

```js {13} title="stacks/ApiStack.ts"
import { Api, StackContext } from "sst/constructs";
import { AuthStack } from "./AuthStack";

export function ApiStack({ stack }: StackContext) {
  const { auth } = use(AuthStack);
  const api = new Api(stack, "Api", {
    routes: {
      "GET  /notes": "src/list.main",
      "POST /notes": "src/create.main",
    },
  });
  auth.attachPermissionsForAuthUsers(stack, [api]);
}
```
