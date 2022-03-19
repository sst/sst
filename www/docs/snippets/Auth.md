---
description: "Snippets for the sst.Auth construct"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

## Allowing users to sign in using User Pool

```js
import { Auth } from "@serverless-stack/resources";

new Auth(this, "Auth", {
  cognito: true,
});
```

## Allowing users to sign in with their email or phone number

```js
new Auth(this, "Auth", {
  cognito: {
    userPool: {
      signInAliases: { email: true, phone: true },
    },
  },
});
```

## Configuring User Pool triggers

The Cognito User Pool can invoke a Lambda function for specific [triggers](#triggers).

### Adding triggers

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

Note that, you can set the `defaultFunctionProps` while using the `FunctionProps` per trigger. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, it will be merged.

```js
new Auth(this, "Auth", {
  cognito: {
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
  },
});
```

So in the above example, the `preAuthentication` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

### Attaching permissions for all triggers

Allow all the triggers to access S3.

```js {10}
const auth = new Auth(this, "Auth", {
  cognito: {
    triggers: {
      preAuthentication: "src/preAuthentication.main",
      postAuthentication: "src/postAuthentication.main",
    },
  },
});

auth.attachPermissionsForTriggers(["s3"]);
```

### Attaching permissions for a specific trigger

Allow one of the triggers to access S3.

```js {10}
const auth = new Auth(this, "Auth", {
  cognito: {
    triggers: {
      preAuthentication: "src/preAuthentication.main",
      postAuthentication: "src/postAuthentication.main",
    },
  },
});

auth.attachPermissionsForTriggers("preAuthentication", ["s3"]);
```

Here we are referring to the trigger using the trigger key, `preAuthentication`. 

## Allowing Twitter auth and a User Pool

```js
new Auth(this, "Auth", {
  cognito: true,
  twitter: {
    consumerKey: "gyMbPOiwefr6x63SjIW8NN2d9",
    consumerSecret: "qxld1zic5c2eyahqK3gjGLGQaOTogGfAgGh17MYOIcOUR9l2Nz",
  },
});
```

## Adding all the supported social logins

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

## Allowing users to login using Auth0

```js
new Auth(this, "Auth", {
  auth0: {
    domain: "https://myorg.us.auth0.com",
    clientId: "UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif",
  },
});
```

## Attaching permissions for authenticated users

```js {9-16}
import * as iam from "aws-cdk-lib/aws-iam";

const auth = new Auth(this, "Auth", {
  cognito: {
    userPool: { signInAliases: { email: true } },
  },
});

auth.attachPermissionsForAuthUsers([
  api,
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["s3:*"],
    resources: ["*"],
  }),
]);
```

Aside from IAM policy statements, you can pass in certain other SST constructs.

## Attaching permissions for unauthenticated users

```js {9-16}
import * as iam from "aws-cdk-lib/aws-iam";

const auth = new Auth(this, "Auth", {
  cognito: {
    userPool: { signInAliases: { email: true } },
  },
});

auth.attachPermissionsForUnauthUsers([
  api,
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["s3:*"],
    resources: ["*"],
  }),
]);
```

Similar to the example above. Aside from IAM policy statements, you can pass in certain other SST constructs.

## Sharing Auth across stacks

You can create the Auth construct in one stack, and attach permissions in other stacks. To do this, expose the Auth as a class property.

<MultiLanguageCode>
<TabItem value="js">

```js {7-9} title="stacks/AuthStack.js"
import { Auth, Stack } from "@serverless-stack/resources";

export class AuthStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.auth = new Auth(this, "Auth", {
      cognito: true,
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```js {4,9-11} title="stacks/AuthStack.ts"
import { App, Auth, Stack, StackProps } from "@serverless-stack/resources";

export class AuthStack extends Stack {
  public readonly auth: Auth;

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    this.auth = new Auth(this, "Auth", {
      cognito: true,
    });
  }
}
```

</TabItem>
</MultiLanguageCode>

Then pass the Auth to a different stack.

<MultiLanguageCode>
<TabItem value="js">

```js {3} title="stacks/index.js"
const authStack = new AuthStack(app, "auth");

new ApiStack(app, "api", { auth: authStack.auth });
```

</TabItem>
<TabItem value="ts">

```ts {3} title="stacks/index.ts"
const authStack = new AuthStack(app, "auth");

new ApiStack(app, "api", { auth: authStack.auth });
```

</TabItem>
</MultiLanguageCode>

Finally, attach the permissions.

<MultiLanguageCode>
<TabItem value="js">

```js title="stacks/ApiStack.js"
import { Api, Stack } from "@serverless-stack/resources";

export class ApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new Api(this, "Api", {
      routes: {
        "GET    /notes": "src/list.main",
        "POST   /notes": "src/create.main",
      },
    });
    props.auth.attachPermissionsForAuthUsers([api]);
  }
}
```

</TabItem>
<TabItem value="ts">

```ts title="stacks/ApiStack.ts"
import { Api, App, Auth, Stack, StackProps } from "@serverless-stack/resources";

interface ApiStackProps extends StackProps {
  readonly auth: Auth;
}

export class ApiStack extends Stack {
  constructor(scope: App, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const api = new Api(this, "Api", {
      routes: {
        "GET    /notes": "src/list.main",
        "POST   /notes": "src/create.main",
      },
    });
    props.auth.attachPermissionsForAuthUsers([api]);
  }
}
```

</TabItem>
</MultiLanguageCode>

## Importing an existing User Pool

Override the internally created CDK `UserPool` and `UserPoolClient` instance.

```js {5,6}
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";

new Auth(this, "Auth", {
  cognito: {
    userPool: UserPool.fromUserPoolId(this, "IUserPool", "pool-id"),
    userPoolClient: UserPoolClient.fromUserPoolClientId(this, "IUserPoolClient", "pool-client-id"),
  }
});
```

## Upgrading to v0.12.0

The v0.12.0 release of the Auth construct includes a small breaking change. You might be impacted by this change if:

- You are currently using any version `< v0.12.0`
- And using Cognito as the authentication provider

### Using `signInAliases`

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

### Using cognitoUserPool and cognitoUserPoolClient

If you are creating the `UserPool` and the `UserPoolClient` manually like this:

```js
import * as cognito from "aws-cdk-lib/aws-cognito";

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
import * as cognito from "aws-cdk-lib/aws-cognito";

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
