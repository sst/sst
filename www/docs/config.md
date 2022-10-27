---
title: Config
description: "Working with environment variables and secrets in SST."
---

import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

SST has built-in support for securely managing environment variables and secrets using a set of libraries collectively called `Config`.

</HeadlineText>

:::tip
Want to learn more about `Config`? Check out the [launch livestream on YouTube](https://youtu.be/6sMTfoeshLo).
:::

---

## Overview

[`Resource Binding`](./resource-binding) lets you bind SST constructs to your functions. For values not related to SST constructs, you can wrap them inside Config, and then bind the Config constructs to your functions.

The `Config` libraries include:

1. Constructs to define these values
   1. [`Config.Secret`](constructs/Secret.md) — Sensitive values you can't be defined in your functions
   2. [`Config.Parameter`](constructs/Parameter.md) — Values not from SST constructs, ie. static values and values from CDK constructs
2. CLI to set secrets [`sst secrets [action]`](packages/cli.md#secrets-action)
3. Lambda helpers to fetch them [`@serverless-stack/node/config`](packages/node.md#config)

---

## Secrets

[`Secret`](constructs/Secret.md) allows you to define, set, and fetch secrets in your app.

---

### Quick Start

1. To create a new secret, add a `Config.Secret` construct to an existing stack in your SST app. You can also create a new stack to define all secrets used in your app.

   ```ts {3}
   import { Config } from "@serverless-stack/resources";

   const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
   ```

   Note that you are not setting the values for the secret in your code. Since you shouldn't have sensitive values committed to git.

2. Bind the secret to a function.

   ```ts {5}
   import { Function } from "@serverless-stack/resources";

   new Function(stack, "MyFunction", {
     handler: "lambda.handler",
     bind: [STRIPE_KEY],
   }
   ```

3. In your terminal, run the `sst secrets` command to set a value for the secret:

   ```bash
   npx sst secrets set STRIPE_KEY sk_test_abc123
   ```

4. Finally in your function code, use the [`@serverless-stack/node/config`](packages/node.md#config) helper library to reference the secret value:

   ```ts {4}
   import { Config } from "@serverless-stack/node/config";

   export const handler = async () => {
     console.log(Config.STRIPE_KEY);

     // ...
   };
   ```

   You'll also need to install the library in your functions directory; `services/` in the case of our starters.

   <MultiPackagerCode>
   <TabItem value="npm">

   ```bash
   npm install @serverless-stack/node
   ```

   </TabItem>
   <TabItem value="yarn">

   ```bash
   yarn add @serverless-stack/node
   ```

   </TabItem>
   </MultiPackagerCode>

---

### `sst secrets`

Here's a full list of `sst secrets` commands to help you manage your secrets.

```bash
# Check the value of a secret
npx sst secrets get STRIPE_KEY

# Check the values of all the secrets
npx sst secrets list

# Unset the value of a secret
npx sst secrets remove STRIPE_KEY
```

You can pass in a stage name to manage the secrets in the non-default stage:

```bash
npx sst secrets list --stage prod
```

---

### How it works

Behind the scenes, secrets are stored as [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) Parameters in your AWS account. When you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

An SSM parameter of the type `SecureString` is created with the name `/sst/{appName}/{stageName}/secrets/STRIPE_KEY`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage you are configuring for. The parameter value `sk_test_abc123` gets encrypted and stored in AWS SSM.

---

#### Function handler

And when you pass secrets into a function:

```ts {3}
new Function(stack, "MyFunction", {
  handler: "lambda.handler",
  bind: [STRIPE_KEY],
}
```

It adds a Lambda environment variables named `SST_SECRET_STRIPE_KEY` to the function. The environment variable has a placeholder value `__FETCH_FROM_SSM__` to indicate that the value for `STRIPE_KEY` needs to be fetched from SSM at runtime.

---

#### Top-level await

At runtime, when you import `@serverless-stack/node/config`:

```ts
import { Config } from "@serverless-stack/node/config";
```

The module performs a top-level await to fetch and decrypt `STRIPE_KEY` from SSM. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.

Note that the secret values are fetched once when the Lambda container first boots up, and the values are cached for subsequent invocations.

:::note
Due to the use of top-level await, your functions need to be bundled in the `esm` format. If you created your app using [`create-sst`](packages/create-sst.md), the bundle format is likely already set to `esm`. Read more about [Function bundle format](constructs/Function.md#format).
:::

---

#### Error handling

If you reference a secret that hasn't been set in the `config` prop for the function, you'll get an error. For example, if you reference something like `Config.XYZ` and it hasn't been set; you'll get the following runtime error.

```
Config.XYZ has not been set for this function.
```

---

#### Typesafety

The `Config` object in your Lambda function code is also typesafe and your editor should be able to autocomplete it.

:::info
The `Config` object in your Lambda function code is typesafe.
:::

---

### Updating secrets

Since secret values are not refetched on subsequent invocations. For a Lambda container instance, when the value changes, the functions still hang on to the old value.

SST forces the functions to refetch the value when it changes. So when you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

SST looks up all the functions using `STRIPE_KEY`. And for each function, SST sets a Lambda environment variable named `SST_ADMIN_SECRET_UPDATED_AT` with the value of the current timestamp. This will trigger the Lambda containers to restart. If a container is in the middle of handling an invocation, it will restart after the invocation is complete.

---

### Fallback values

Sometimes the value of a secret is the same across multiple stages. This is often the case if you have multiple dev stages. In the above example, it's likely all the dev stages share the same secret value. You can set a fallback value, and all the stages in the same AWS account and region will inherit the fallback value if it hasn't been set for the specific stage.

To set a fallback value for `STRIPE_KEY`, run:

```bash
npx sst secrets set-fallback STRIPE_KEY sk_test_abc123
```

Similar to the `set` command, SST creates an AWS SSM Parameter of the type `SecureString`. And the parameter name in this case is `/sst/{appName}/.fallback/secrets/STRIPE_KEY`.

:::note
The fallback value can only be inherited by stages deployed in the same AWS account and region.
:::

If a function uses the `STRIPE_KEY` secret, but neither the secret value or the fallback value is set, you'll get a runtime error when importing `@serverless-stack/node/config`.

```
The following secrets were not found: STRIPE_KEY
```

---

## Parameters

[`Parameter`](constructs/Parameter.md) is the recommended way to pass data that cannot be passed as Resource Binding to your Lambda functions.

---

### Quick start

Assuming you created an ECS cluster in your app and you need to pass the cluster's name to your functions. Create a `Config.Parameter` construct and binds it to the `api` in our example:

1. To create a new parameter, add a `Config.Parameter` construct.

   ```ts {5-7}
   import { Config } from "@serverless-stack/resources";

   const cluster = new ecs.Cluster(stack, "myCluster");

   const MY_CLUSTER_NAME = new Config.Parameter(stack, "MY_CLUSTER_NAME", {
     value: cluster.clusterName
   });
   ```

2. Bind the parameter to a function.

   ```ts {5}
   import { Function } from "@serverless-stack/resources";

   new Function(stack, "MyFunction", {
     handler: "lambda.handler",
     bind: [MY_CLUSTER_NAME],
   }
   ```

3. In your function code, use the [`@serverless-stack/node/config`](packages/node.md#config) helper library to reference the parameter value:

   ```ts {4}
   import { Config } from "@serverless-stack/node/config";

   export const handler = async () => {
     console.log(Config.MY_CLUSTER_NAME);

     // ...
   };
   ```

   You'll also need to install the library in your functions directory; `services/` in the case of our starters.

   <MultiPackagerCode>
   <TabItem value="npm">

   ```bash
   npm install @serverless-stack/node
   ```

   </TabItem>
   <TabItem value="yarn">

   ```bash
   yarn add @serverless-stack/node
   ```

   </TabItem>
   </MultiPackagerCode>

---

### How it works

Behind the scenes, parameters are stored as Lambda environment variables. When you pass a parameter into a function:

```ts
new Function(stack, "MyFunction", {
  handler: "lambda.handler",
  bind: [USER_UPDATED_TOPIC],
}
```

A Lambda environment variable is added to the function, named `SST_PARAM_USER_UPDATED_TOPIC` with the value of the topic name.

---

#### Function handler

And at runtime, when you import `@serverless-stack/node/config`:

```ts
import { Config } from "@serverless-stack/node/config";
```

The module reads the value from `process.env.SST_PARAM_USER_UPDATED_TOPIC` and assigns it to `Config.USER_UPDATED_TOPIC`. You can then reference `Config.USER_UPDATED_TOPIC` directly in your code.

---

#### Store in SSM

SST also stores a copy of the parameter values in [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html). For each parameter, an SSM parameter of the type `String` is created with the name `/sst/{appName}/{stageName}/parameters/USER_UPDATED_TOPIC`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage. The parameter value in this case is the topic name stored in plain text.

Storing the parameter values in SSM might seem redundant. But it provides a convenient way to fetch all the parameters used in your application. This can be extremely useful for testing. This isn't possible when using Lambda environment variables and we are going to see why in the next section.

---

#### Error handling

If you reference a parameter that hasn't been set in the `config` prop for the function, you'll get an error. For example, if you reference something like `Config.XYZ` and it hasn't been set; you'll get the following runtime error.

```
Config.XYZ has not been set for this function.
```

---

#### Typesafety

The `Config` object in your Lambda function code is also typesafe and your editor should be able to autocomplete it.

:::info
The `Config` object in your Lambda function code is typesafe.
:::

---

## Other languages

SST also has built-in support for loading environment variables from a `.env` file into `process.env` using [dotenv](https://github.com/motdotla/dotenv).

:::caution Not Recommended
Although `.env` files are supported, it's strongly recommended that you use `Config.Parameter` or `Config.Secret` to manage environment variables and secrets.
:::

`.env` support in SST is similar to what [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#loading-environment-variables) do for environment variables. For example if you add the following `.env` file to your project root.

```bash title=".env"
TABLE_READ_CAPACITY=5
TABLE_WRITE_CAPACITY=5
```

SST will load the `process.env.TABLE_READ_CAPACITY` and `process.env.TABLE_WRITE_CAPACITY` variables into the Node.js environment; automatically allowing you to use them in your CDK code.

---

#### Types of `.env` files

Aside from the default `.env` file, there are a couple of other types of `.env` files. You can use them to better organize the environment variables in your SST app.

---

##### `.env.{stageName}`

You can add a `.env.{stageName}` file to override the default values for a specific stage. For example, this overrides the value for the `prod` stage:

```bash title=".env.prod"
TABLE_READ_CAPACITY=20
```

---

##### `.env*.local`

You can also add `.env.local` and `.env.{stageName}.local` files to set up environment variables that are specific to your local machine.

---

##### Priority

Here's the priority in which these files are loaded. Starting with the one that has the highest priority.

1. `.env.dev.local`
2. `.env.dev`
3. `.env.local`
4. `.env`

Assume that the current stage is `dev`.

---

#### Committing `.env` files

The `.env` and `.env.{stageName}` files can be committed to your Git repository. On the other hand, the `.env.local` and `.env.{stageName}.local` shouldn't.

The `.env*.local` files are meant to specify sensitive information specific to your machine. They should be ignored through the `.gitignore` file.

:::caution
Don't commit any `.env` files to Git that contain sensitive information.
:::

Note that, SST doesn't enforce these conventions. They are just guidelines that you can use to organize your environment variables. Similar to the ones used by [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#default-environment-variables).

---

#### Expanding variables

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

---

#### Other environment variables

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

---

#### Environment variables in Seed

The above idea also applies to environment variables that are set in [Seed](https://seed.run) or other CIs. If you have an [environment variable set in Seed](https://seed.run/docs/storing-secrets), it'll override the one you have set in your `.env` files.

---

#### Environment variables in Lambda functions

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

---

## Cost

Secrets and Parameters are stored in AWS SSM with the _Standard Parameter type_ and _Standard Throughput_. This makes Config [free to use](https://aws.amazon.com/systems-manager/pricing/) in your SST apps.

---

## FAQ

Here are some frequently asked questions about `Config`.

---

### `Config` or `.env` for secrets?

Although SST supports managing secrets using `.env` files, it's **not recommended**.

Take the example of a Stripe secret key. Using the `.env` way, you would create a `.env.local` file on your local.

```
STRIPE_KEY=sk_test_abc123
```

Since the `.env.local` file is not committed to git, every team member working on the app would need to create a similar `.env.local` file. And they'll need to bug you to get the value.

If you want to deploy the app through your CI pipeline, you'll need to store the `STRIPE_KEY` in your CI pipeline. In addition, if you are deploying to multiple stages through your CI pipeline, each stage would need its own `STRIPE_KEY`, you'd store both versions of the key (ie. `STRIPE_KEY_STAGE_FOO` and `STRIPE_KEY_STAGE_BAR`), and pick the one that matches the stage name at deploy time.

All these are made simpler and far more secure, with `Config`. You set the secrets centrally for all stages:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
npx sst secrets set STRIPE_KEY sk_live_xyz456 --stage foo
npx sst secrets set STRIPE_KEY sk_live_xyz789 --stage bar
```

And at runtime, the functions are going to pick up the correct value based on the stage, whether they are running locally, inside a test, or in production.

Finally, the `Config` object in your Lambda function handles errors and is typesafe. So unlike `process.env`, `Config.STRIPE_KEY` will autocomplete. And `Config.XYZ` will throw a runtime error.