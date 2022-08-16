---
title: Environment Variables
description: "Working with environment variables in SST"
---

SST has built-in support for managing secrets and environment variables using `Config`.

## Config.Secret

[`Secret`](constructs/Secret) provides a simple way to:

  - Centrally define secrets used in your app.
  - Manage secret values using the CLI.
  - Fetch secret values at runtime.
  - Auto-complete on variable names.

### Quick Start

1. To create a new secret, add a `Config.Secret` construct to an existing stack in your SST app. You can also create a new stack to define all secrets used in your app.
  ```ts
  import { Config, StackContext } from "@serverless-stack/resources";

  export default function SecretsStack({ stack }: StackContext) {
    const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
    const GITHUB_TOKEN = new Config.Secret(stack, "GITHUB_TOKEN");

    return { STRIPE_KEY, GITHUB_TOKEN };
  }
  ```
Note that the values for the secrets are not defined here by design. You shouldn't have sesitive values in your code commited to git.

2. Pass the secrets into the function that needs to access the secret value at runtime.
  ```ts {9}
  import { use, Function, StackContext } as sst from "@serverless-stack/resources";
  import SecretsStack from "./SecretsStack";

  export default function MyStack({ stack }: StackContext) {
    const { STRIPE_KEY, GITHUB_TOKEN } = use(SecretsStack);

    new Function(stack, "MyFunction", {
      handler: "lambda.handler",
      config: [STRIPE_KEY, GITHUB_TOKEN],
    }
  };
  ```

3. In your terminal, run the `sst secrets` command to set a value for the secret:
  ```bash
  npx sst secrets set STRIPE_KEY sk_test_abc123
  ```

4. And finally in your function code, use the `@serverless-stack/node/config` helper library to reference the secret value:
  ```ts
  import { Config } from "@serverless-stack/node/config";

  export const handler = async () => {

    console.log(Config.STRIPE_KEY);

    // ...
  }
  ```

5. Here is a full list of `sst secrets` commands to help you manage your secrets.

  ```bash
  # Check the value of a secret
  npx sst secrets get STRIPE_KEY

  # Check the values of all the secrets, run:
  npx sst secrets list

  # Unset the value of a secret, run:
  npx sst secrets remove STRIPE_KEY
  ```

  You can pass in a stage name to manage the secrets in the non-default stage:

  ```bash
  npx sst secrets list --stage prod
  ```

### How it works

Behind the scene, secrets are stored as [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) Parameters in your AWS account.

When you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```
 
An SSM parameter of the type `SecureString` is created with the name `/aws/{appName}/{stageName}/secrets/STRIPE_KEY`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage you are configuring for. The parameter value `sk_test_abc123` gets encrypted and stored on AWS SSM.

And when you pass secrets into a function:

```ts {3}
new Function(stack, "MyFunction", {
  handler: "lambda.handler",
  config: [STRIPE_KEY, GITHUB_TOKEN],
}
```

This adds 2 Lambda environment variables to the function, `SST_SECRET_STRIPE_KEY` and `SST_SECRET_GITHUB_TOKEN`. Both with a placeholder value `1` to indicate the values for `STRIPE_KEY` and `GITHUB_TOKEN` need to be fetched at runtime.

And at runtime, when you import `@serverless-stack/node/config`:

```ts
import { Config } from "@serverless-stack/node/config";
```

The module performs a top-level await to fetch and decrypt `STRIPE_KEY` and `GITHUB_TOKEN` from SSM. Once fetched, you can reference `Config.STRIPE_KEY` and `Config.GITHUB_TOKEN` directly in your code.

Note that the secret values are fetched once when the Lambda container first boots up, and the values are cached for subsequent invocations.

:::note
Due to the use of top-level await, your functions need to be bundled in the `esm` format. If you created your app using `create-sst`, the bundle format is likely already set to `esm`. Read more about [Function bundle format](./constructs/Function.md#format).
:::

### Updating secret values

Because secret values are not refetched on subsequent invocations for a given Lambda container instance, when the value changes, functions still hang on to the old value.

To force the functions refetch on value changes, when you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

SST looks up all the functions using `STRIPE_KEY`. And for each function, SST sets a Lambda environment variable named `SST_ADMIN_SECRET_UPDATED_AT` with the value of the current timestamp. This will trigger the Lambda containers to restart. If a container is in the middle of handling an invocation, it will restart after the invocation is completed.

### Fallback values

Sometimes the value of a secret is the same across multiple stages. This is often the case if you have multiple dev stages. In the above example, it is likely all the dev stages share the same secret value. You can set a fallback value, and all the stages in the same AWS account and region will inherit the fallback value if a one is not set for the specific stage.

To set the fallback value for `STRIPE_KEY`, run:

```bash
npx sst secrets set-fallback STRIPE_KEY sk_test_abc123
```

Similar to the `set` command, SST creates an AWS SSM Parameter of the type `SecureString`. And the parameter name in this case is `/aws/{appName}/.fallback/secrets/STRIPE_KEY`.

:::note
The fallback value can only be inherited by stages deployed to the same AWS account and region.
:::

If a function uses the `STRIPE_KEY` secret, but neither the secret value or the fallback value are set, you will get a runtime error on importing `@serverless-stack/node/config`.

### Secret vs .env

Although [SST supports managing secrets using `.env` files](#env-not-recommended), it is **not recommended**.

Take the same example above with the Stripe secret key, using the `.env` way, you would create a `.env.local` file on your local that looks like this:

```
STRIPE_KEY=sk_test_abc123
```

Because the `.env.local` file is not commited to git, every team member working on the app need to create a similar `.env.local` file. And they will likely have to bug you and ask for the value.

And if you want to deploy the app through your CI pipeline, you need to store `STRIPE_KEY` in your CI pipeline. In addition, if you are deploying to multiple stages through your CI pipeline, and each stage has their own `STRIPE_KEY`, you'd store both versions of the key (ie. `STRIPE_KEY_STAGE_FOO` and `STRIPE_KEY_STAGE_BAR`), and pick the one that matches the stage name at deploy time.

All these are made much simpler if you used `Config`. You set the secrets centrally for all stages:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
npx sst secrets set STRIPE_KEY sk_live_xyz456 --stage foo
npx sst secrets set STRIPE_KEY sk_live_xyz789 --stage bar
```

And at runtime, the functions is going to pick up the correct value based on the stage they are running in whether they are running locally, inside a test, or in production.

## Config.Parameter

[`Parameter`](constructs/Parameter.md) is the recommended way to configure environment variables for Lambda functions.

### Quick Start

1. To create a new parameter, add a `Config.Parameter` construct.
  ```ts {7-9}
  import { Config, Topic, StackContext } from "@serverless-stack/resources";
  
  export default function TopicsStack({ stack }: StackContext) {
  
    const topic = new Topic(stack, "USER_UPDATED");
  
    const USER_UPDATED_TOPIC = new Config.Parameter(stack, "USER_UPDATED_TOPIC", {
      value: topic.topicName,
    });
  
    return { USER_UPDATED_TOPIC };
  }
  ```

2. Pass the parameter into the function that needs to access the parameter value at runtime.
  ```ts {9}
  import { use, Function, StackContext } as sst from "@serverless-stack/resources";
  import TopicsStack from "./TopicsStack";

  export default function MyStack({ stack }: StackContext) {
    const { USER_UPDATED_TOPIC } = use(SecretsStack);

    new Function(stack, "MyFunction", {
      handler: "lambda.handler",
      config: [USER_UPDATED_TOPIC],
    }
  };
  ```

3. In your function code, use the `@serverless-stack/node/config` helper library to reference the parameter value:
  ```ts
  import { Config } from "@serverless-stack/node/config";

  export const handler = async () => {

    console.log(Config.USER_UPDATED_TOPIC);

    // ...
  }
  ```

### How it works

Behind the scene, parameters are stored as Lambda function environments. When you pass a parameter into a function:

```ts {3}
new Function(stack, "MyFunction", {
  handler: "lambda.handler",
  config: [USER_UPDATED_TOPIC],
}
```

A Lambda environment variable is added to the function named `SST_PARAM_USER_UPDATED_TOPIC` with the value of the topic name.

And at runtime, when you import `@serverless-stack/node/config`:
```ts
import { Config } from "@serverless-stack/node/config";
```

The module reads the value from `process.env.SST_PARAM_USER_UPDATED_TOPIC` and assigns to `Config.USER_UPDATED_TOPIC`. And you can reference `Config.USER_UPDATED_TOPIC` directly in your code.

SST also stores a copy of the parameter values in [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html). For each parameter, an SSM parameter of the type `String` is created with the name `/aws/{appName}/{stageName}/parameters/USER_UPDATED_TOPIC`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage you are configuring for. The parameter value in this case is the topic name stored in plain text.

Storing the parameter values in SSM might seem redundant at first. But it provides a convenient way to fetch all parameters used in your application. This can be extremely useful for testing which was previously not possible when using Lambda environment variables. We are going to why that is the case in the next section.

### Parameter vs Lambda environment

Lambda environment variables have a couple of drawbacks. Imagine you have a Lambda function that looks like this, and `TOPIC_NAME` is stored as a Lambda environment variable:

```ts title="services/users/updated.ts"
export const handler = async () => {
  if (process.env.TOPIC_NAME !== "UserUpdated") {
    return;
  }

  // ...
}
```

1. When testing this function locally or in your CI pipeline, you need to figure out the value for `TOPIC_NAME` and set it as an environment variable for the test.

2. In addition, imagine you have another function that also has a `TOPIC_NAME` Lambda environment variable, but with a different value.

```ts title="services/billing/charged.ts"
export const handler = async () => {
  if (process.env.TOPIC_NAME !== "InvoiceCharged") {
    return;
  }

  // ...
}
```

What should you set the `TOPIC_NAME` to for your tests?

With `Config`, the value for each Parameter are store in SSM. When running tests, you can easily look up the values by fetching all SSM Parameters prefixed with `/aws/{appName}/{stageName}/parameters/*`.

Because `Config` enforces Parameter values to be the same for all functions using them, you would not run into the second issue above.

## .env (not recommended)

SST has built-in support for loading environment variables from a `.env` file into `process.env` using [dotenv](https://github.com/motdotla/dotenv).

:::caution
Although `.env` files are support, it is strongly recommended to use `Config` to manage environment variables.
:::

This is similar to what [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#loading-environment-variables) do for environment variables.

For example if you add the following `.env` file to your project root.

```bash title=".env"
TABLE_READ_CAPACITY=5
TABLE_WRITE_CAPACITY=5
```

SST will load the `process.env.TABLE_READ_CAPACITY` and `process.env.TABLE_WRITE_CAPACITY` variables into the Node.js environment; automatically allowing you to use them in your CDK code.

### Types of `.env` files

Aside from the default `.env` file, there are a couple of other types of `.env` files. You can use them to better organize the environment variables in your SST app.

#### `.env.{stageName}`

You can add a `.env.{stageName}` file to override the default values for a specific stage. For example, this overrides the value for the `prod` stage:

```bash title=".env.prod"
TABLE_READ_CAPACITY=20
```

#### `.env*.local`

You can also add `.env.local` and `.env.{stageName}.local` files to set up environment variables that are specific to your local machine.

#### Priority

Here's the priority in which these files are loaded. Starting with the one that has the highest priority.

1. `.env.dev.local`
2. `.env.dev`
3. `.env.local`
4. `.env`

Assume that the current stage is `dev`.

### Committing `.env` files

The `.env` and `.env.{stageName}` files can be committed to your Git repository. On the other hand, the `.env.local` and `.env.{stageName}.local` shouldn't.

The `.env*.local` files are meant to specify sensitive information specific to your machine. They should be ignored through the `.gitignore` file.

:::caution
Don't commit any `.env` files to Git that contain sensitive information.
:::

Note that, SST doesn't enforce these conventions. They are just guidelines that you can use to organize your environment variables. Similar to the ones used by [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#default-environment-variables).


### Expanding variables

SST will also automatically expand variables (`$VAR`). For example:

```bash
DEFAULT_READ_CAPACITY=5
USERS_TABLE_READ_CAPACITY=$DEFAULT_READ_CAPACITY
POSTS_TABLE_READ_CAPACITY=$DEFAULT_READ_CAPACITY
```

If you are trying to use a variable with a `$` in the actual value, it needs to be escaped, `\$`.

```bash
NAME=Spongebob

# becomes "Hi Spongebob"
GREETING=Hi $NAME

# becomes "Hi $NAME"
GREETING=Hi \$NAME
```

### Other environment variables

The `.env` environment variables will not modify an environment variable that has been previously set. So if you run the following:

```bash
NAME=Spongebob 
npx sst deploy
```

While your `.env` has.

```bash
NAME=Patrick
```

The `.env` value will be ignored and `process.env.NAME` will be set to `Spongebob`.

### Environment variables in Seed

The above idea also applies to environment variables that are set in [Seed](https://seed.run) or other CIs. If you have an [environment variable set in Seed](https://seed.run/docs/storing-secrets), it'll override the one you have set in your `.env` files.

### Environment variables in Lambda functions

The `.env` environment variables are only available in your CDK code.

You can also set them as Lambda environment variables by including them in the [Function](constructs/Function.md) `environment` prop:

```js
new Function(this, "MyFunction", {
  handler: "src/api.main",
  environment: {
    MY_ENV_VAR: process.env.MY_ENV_VAR,
  },
});
```

Or you can use the [App's](constructs/App.md) [`setDefaultFunctionProps`](constructs/App.md#setdefaultfunctionprops) method to set it for all the functions in your app.

```js title="stacks/index.js"
export default function main(app) {
  app.setDefaultFunctionProps({
    environment: { MY_ENV_VAR: process.env.MY_ENV_VAR },
  });

  new MySampleStack(app, "sample");
}
```

## Built-in environment variables

#### `IS_LOCAL`

SST sets the `IS_LOCAL` environment variable to `true` by default when running inside `sst start`, the [Live Lambda Development environment](live-lambda-development.md).

The `process.env.IS_LOCAL` is set in both the CDK and Lambda function code.

So in your CDK code you can do something like. 

``` js title="stacks/MyStack.js" {6}
function Stack(ctx) {
  // Increase the timeout locally
  const timeout = process.env.IS_LOCAL
    ? 900
    : 15;

  // Rest of the resources
}
```

And in your Lambda functions.

``` js title="src/lambda.js" {2}
export async function main(event) {
  const body = process.env.IS_LOCAL
    ? "Hello, Local!"
    : "Hello, World!"

  return {
    body,
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
  };
}
```