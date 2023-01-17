---
title: Config
description: "Working with environment variables and secrets in SST."
---

import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Built-in support for securely managing environment variables and secrets.

</HeadlineText>

:::tip
Want to learn more about `Config`? Check out the [launch livestream on YouTube](https://youtu.be/6sMTfoeshLo).
:::

---

## Overview

`Config` allows you to securely pass the following into your functions.

1. [**Secrets**](#secrets): Sensitive values that cannot be defined in your code. You can use the [`sst secrets`](packages/sst.md#sst-secrets) CLI to set them.
2. [**Parameters**](#parameters): Values from non-SST constructs, ie. CDK constructs or static values.

:::info
If you want to pass values from SST constructs to your functions, you should bind them using [Resource Binding](resource-binding.md).
:::

And once you've defined your Secrets and Parameters, you can fetch them in your Lambda functions with the [`@serverless-stack/node/config`](clients/config.md) package.

---

## Secrets

[`Config.Secret`](constructs/Secret.md) allows you to define, set, and fetch secrets in your app. Let's see how it works.

---

### Quick Start

To see how Secrets work, we are going to create a Secret with Stripe secret key and bind it to a Lambda function.

Follow along by creating the Minimal TypeScript starter by running `npx create-sst@latest` > `minimal` > `minimal/typescript-starter`. Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/minimal-typescript) that's based on the same template.

1. To create a new secret, open up `stacks/MyStack.ts` and add a [`Config.Secret`](constructs/Secret.md) construct below the API. You can also create a new stack to define all secrets used in your app.

   ```ts title="stacks/MyStack.ts"
   const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
   ```

   You'll also need to import `Config` at the top.

   ```ts
   import { Config } from "@serverless-stack/resources";
   ```

   Note that you are not setting the values for the secret in your code. You shouldn't have sensitive values committed to Git.

2. Bind the `STRIPE_KEY` to the `api`.

   ```ts title="stacks/MyStack.ts"
   api.bind([STRIPE_KEY]);
   ```

3. Then in your terminal, run the `sst secrets` CLI to set a value for the secret.

   ```bash
   npx sst secrets set STRIPE_KEY sk_test_abc123
   ```

4. Now you can access the Stripe key in your API using the [`Config`](clients/config.md) helper. Change `services/functions/lambda.ts` to:

   ```ts title="services/functions/lambda.ts" {8}
   import { APIGatewayProxyHandlerV2 } from "aws-lambda";
   import { Config } from "@serverless-stack/node/config";

   export const handler: APIGatewayProxyHandlerV2 = async () => {
     return {
       statusCode: 200,
       headers: { "Content-Type": "text/plain" },
       body: `Here is my Stripe key ${Config.STRIPE_KEY}. Don't share with others!`,
     };
   };
   ```

   You'll also need to install the node package in the `services/` directory.

   ```bash
   npm install --save @serverless-stack/node
   ```

   That's it!

---

### `sst secrets`

We used the [`sst secrets set`](packages/sst.md#sst-secrets-set) CLI in the above example to set a secret. Here are some of the other commands.

- `npx sst secrets get STRIPE_KEY` to check the value of a secret
- `npx sst secrets list` to get the values of all the secrets
- `npx sst secrets remove STRIPE_KEY` to unset the value of a secret

You can also pass in a stage name to manage the secrets for a specific stage.

```bash
npx sst secrets list --stage prod
```

[Read more about the `sst secrets` CLI](packages/sst.md#sst-secrets).

---

### How it works

Behind the scenes, secrets are stored as [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) Parameters in your AWS account. When you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

An SSM parameter of the type `SecureString` is created with the name `/sst/{appName}/{stageName}/Secret/STRIPE_KEY/value`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage you are configuring for. The parameter value `sk_test_abc123` gets encrypted and stored in AWS SSM.

---

#### Function handler

And when you pass secrets into a function:

```ts {3}
new Function(stack, "MyFunction", {
  handler: "lambda.handler",
  bind: [STRIPE_KEY],
}
```

It adds a Lambda environment variables named `SST_Secret_value_STRIPE_KEY` to the function. The environment variable has a placeholder value `__FETCH_FROM_SSM__` to indicate that the value for `STRIPE_KEY` needs to be fetched from SSM at runtime.

---

#### Top-level await

At runtime when you import the `Config` package in your function.

```ts
import { Config } from "@serverless-stack/node/config";
```

It performs a top-level await to fetch and decrypt `STRIPE_KEY` from SSM. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.

:::note
Due to the use of top-level await, your functions need to be bundled in the `esm` format. If you created your app using [`create-sst`](packages/create-sst.md), the bundle format is likely already set to `esm`. [Here's how to set the Function bundle format](constructs/Function.md#format).
:::

Note that the secret values are fetched once when the Lambda container first boots up, and the values are cached for subsequent invocations.

---

#### Error handling

If you reference a secret that hasn't been set in the `bind` prop for the function, you'll get an error. For example, if you reference something like `Config.XYZ` and it hasn't been set; you'll get the following runtime error.

```
Config.XYZ has not been set for this function.
```

---

#### Typesafety

The `Config` object in your Lambda function code is also typesafe and your editor should be able to autocomplete the options.

---

### Updating secrets

Secret values are not refetched on subsequent Lambda function invocations. So if the value of a secret changes while the Lambda container is still warm, it'll hang on to the old value.

To address this, SST forces functions to refetch the secret when its value changes. So when you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

SST looks up all the functions using `STRIPE_KEY`. And for each function, SST sets a Lambda environment variable named `SST_ADMIN_SECRET_UPDATED_AT` with the value of the current timestamp. This will trigger the Lambda containers to restart. If a container is in the middle of handling an invocation, it will restart after the invocation is complete.

---

### Fallback values

Sometimes you might be creating ephemeral stages or preview environments from pull requests. It can be annoying to manually set the value of a secret for these stages especially because they might all be using the same value.

To make this easier, you can set a fallback value for a secret. And if its value isn't set for a stage, it'll use the fallback value instead.

:::tip
Set a fallback value for your secret so you don't have to set them for ephemeral stages.
:::

In the above example, it's likely all the dev stages share the same `STRIPE_KEY`. So set a fallback value by running:

```bash
npx sst secrets set-fallback STRIPE_KEY sk_test_abc123
```

Similar to the `set` command, SST creates an AWS SSM Parameter of the type `SecureString`. And the parameter name in this case is `/sst/{appName}/.fallback/Secret/STRIPE_KEY/value`.

:::info
The fallback value can only be inherited by stages deployed in the same AWS account and region.
:::

If a function uses the `STRIPE_KEY` secret, but neither the secret value or the fallback value has been set, you'll get a runtime error when you import `@serverless-stack/node/config`.

```
The following secrets were not found: STRIPE_KEY
```

---

## Parameters

[`Config.Parameter`](constructs/Parameter.md) allows you to pass values from non-SST constructs, ie. CDK constructs or static values to your Lambda functions. Let's see it in action.

---

### Quick start

To see how Parameters work, we are going to create a Parameter with the version of your app and bind it to a Lambda function.

Follow along by creating the Minimal TypeScript starter by running `npx create-sst@latest` > `minimal` > `minimal/typescript-starter`. Alternatively, you can refer to [this example repo](https://github.com/serverless-stack/sst/tree/master/examples/minimal-typescript) that's based on the same template.

1. To create a new parameter, open up `stacks/MyStack.ts` and add a [`Config.Parameter`](constructs/Parameter.md) construct below the API.

   ```ts title="stacks/MyStack.ts"
   const APP_VERSION = new Config.Parameter(stack, "APP_VERSION", {
     value: "1.2.0",
   });
   ```

   You'll also need to import `Config` at the top.

   ```ts
   import { Config } from "@serverless-stack/resources";
   ```

2. Bind the `APP_VERSION` to the `api`.

   ```ts title="stacks/MyStack.ts"
   api.bind([APP_VERSION]);
   ```

3. Now you can access the app verion in your API using the [Config](clients/config.md) helper. Change `services/functions/lambda.ts` to:

   ```ts title="services/functions/lambda.ts" {8}
   import { APIGatewayProxyHandlerV2 } from "aws-lambda";
   import { Config } from "@serverless-stack/node/config";

   export const handler: APIGatewayProxyHandlerV2 = async () => {
     return {
       statusCode: 200,
       headers: { "Content-Type": "text/plain" },
       body: `App version is ${Config.APP_VERSION}.`,
     };
   };
   ```

   You'll also need to install the node package in the `services/` directory.

   ```bash
   npm install --save @serverless-stack/node
   ```

   That's it!

---

### How it works

Behind the scenes, parameters are stored as Lambda environment variables. When you pass a parameter into a function:

```ts
new Function(stack, "MyFunction", {
  handler: "lambda.handler",
  bind: [USER_UPDATED_TOPIC],
}
```

A Lambda environment variable is added to the function, named `SST_Parameter_value_USER_UPDATED_TOPIC` with the value of the topic name.

---

#### Function handler

At runtime when you import the `Config` package in your function.

```ts
import { Config } from "@serverless-stack/node/config";
```

It reads the value from `process.env.SST_Parameter_value_USER_UPDATED_TOPIC` and assigns it to `Config.USER_UPDATED_TOPIC`. You can then reference `Config.USER_UPDATED_TOPIC` directly in your code.

---

#### Copy to SSM

SST also stores a copy of the parameter value in [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html). For each parameter, an SSM parameter of the type `String` is created with the name `/sst/{appName}/{stageName}/parameters/USER_UPDATED_TOPIC`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage. The parameter value is the topic name stored in plain text.

Storing the parameter values in SSM might seem redundant. But it provides a convenient way to fetch all the parameters used in your application. This can make it easy to test your functions. [Read more about how SST uses `Config` to make testing easier](testing.md#how-sst-bind-works).

---

#### Error handling

If you reference a parameter that hasn't been set in the `bind` prop, you'll get an error. For example, if you reference something like `Config.XYZ` and it hasn't been set; you'll get the following runtime error.

```
Config.XYZ has not been set for this function.
```

---

#### Typesafety

The `Config` object in your Lambda function code is also typesafe and your editor should be able to autocomplete the options.

---

## Cost

Secrets and Parameters are stored in AWS SSM with the _Standard Parameter type_ and _Standard Throughput_. This makes `Config` [free to use](https://aws.amazon.com/systems-manager/pricing/) in your SST apps.

---

## Other languages

The `Config` Lambda function package only supports JavaScript and TypeScript. For other languages, SST supports loading environment variables using [dotenv](https://github.com/motdotla/dotenv).

:::caution
If you are using JavaScript or TypeScript, it's strongly recommended that you use `Config` to manage your secrets and parameters.
:::

The `.env` support in SST is similar to what [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#loading-environment-variables) do for environment variables. For example if you add the following `.env` file to your project root.

```bash title=".env"
TABLE_READ_CAPACITY=5
TABLE_WRITE_CAPACITY=5
```

SST will load the `process.env.TABLE_READ_CAPACITY` and `process.env.TABLE_WRITE_CAPACITY` variables into the Node.js environment; automatically allowing you to use them in your CDK code.

---

#### Types of `.env` files

Aside from the default `.env` file, there are a couple of other types of `.env` files. You can use them to better organize the environment variables in your SST app.

- `.env.{stageName}`

  You can add a `.env.{stageName}` file to override the default values for a specific stage. For example, this overrides the value for the `prod` stage:

  ```bash title=".env.prod"
  TABLE_READ_CAPACITY=20
  ```

- `.env*.local`

  You can also add `.env.local` and `.env.{stageName}.local` files to set up environment variables that are specific to your local machine.

Here's the priority in which these files are loaded. Starting with the one that has the highest priority.

1. `.env.dev.local`
2. `.env.dev`
3. `.env.local`
4. `.env`

Assume that the current stage is `dev`.

---

#### Committing `.env` files

The `.env` and `.env.{stageName}` files can be committed to Git. On the other hand, the `.env.local` and `.env.{stageName}.local` shouldn't.

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

The `.env` environment variables are only available in your infrastructure code.

You can also set them as Lambda environment variables by including them in the [Function](constructs/Function.md) `environment` prop:

```js
new Function(stack, "MyFunction", {
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

## FAQ

Here are some frequently asked questions about `Config`.

---

### Should I use `Config.Secret` or `.env` for secrets?

Although SST supports managing secrets using `.env` files, it's **not recommended**. Here are a couple of reasons why.

Let's take the example of a Stripe secret key. Using the `.env` way, you would create a `.env.local` file on your local.

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

You can also set a fallback value for ephemeral stages.

```bash
npx sst secrets set-fallback STRIPE_KEY sk_test_abc123
```

At runtime, the functions are going to pick up the correct value based on the stage, whether they are running locally, inside a test, or in production.

Finally, the `Config` object in your Lambda function handles errors and is typesafe. So unlike `process.env`, `Config.STRIPE_KEY` will autocomplete. And an invalid secret like `Config.XYZ` will throw a runtime error.
