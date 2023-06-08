---
title: Config
description: "Working with environment variables and secrets in SST."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Built-in support for securely managing environment variables and secrets.

</HeadlineText>

---

## Overview

SST has a built-in way to connect your frontend and functions to your infrastructure, called [Resource Binding](resource-binding.md). However, there are a couple of cases where you need to manually pass in some info.

You can do this using `Config`. It allows you to pass in:

1. [**Secrets**](#secrets): Sensitive values that cannot be defined in your code. You can use the [`sst secrets`](packages/sst.md#sst-secrets) CLI to set them.
2. [**Parameters**](#parameters): Values from non-SST constructs, ie. static values or CDK constructs.

Once defined you can access these in your frontend or functions using the [`sst/node/config`](clients/config.md) package.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

Let's define some config values and load them in our frontend.

---

## Define a secret

Add a secret to your stacks.

```ts title="stacks/Default.ts"
const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
```

:::note
We don't set the values for the secret in your code.
:::

---

## Define a parameter

Add a parameter to your stacks.

```ts title="stacks/Default.ts"
const VERSION = new Config.Parameter(stack, "VERSION", {
  value: "1.2.0",
});
```

Unlike the secret, we are setting the value of a parameter in code.

---

#### Add the imports

Import the `Config` construct at the top.

```diff
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Config, StackContext, NextjsSite } from "sst/constructs";
```

---

## Bind the config

Let's bind the secret and parameter to our Next.js app.

```diff title="stacks/Default.ts"
const site = new NextjsSite(stack, "site", {
+ bind: [VERSION, STRIPE_KEY],
  path: "packages/web",
});
```

This allows Next.js app to access them.

---

## Set the secret value

Then in your terminal set a value for the secret.

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

We use the [`sst secrets`](packages/sst.md#sst-secrets) CLI.

---

## Load the config

Now you can access the secret and parameter in your Next.js app.

```ts title="packages/web/pages/index.tsx" {1,4}
import { Config } from "sst/node/config";

export async function getServerSideProps() {
  console.log(Config.VERSION, Config.STRIPE_KEY);

  return { props: { loaded: true } };
}
```

:::tip
Since we are dealing with sensitive info, Config is only supported in the frontend's server side functions.
:::

---

## How it works

Let's take a look at how secrets and parameters work behind the scenes.

---

### Secrets

Behind the scenes, secrets are stored as [AWS SSM](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) Parameters in your AWS account. When you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

An SSM parameter of the type `SecureString` is created with the name `/sst/{appName}/{stageName}/Secret/STRIPE_KEY/value`, where `{appName}` is the name of your SST app, and `{stageName}` is the stage you are configuring for. The parameter value `sk_test_abc123` gets encrypted and stored in AWS SSM.

---

#### Function handler

And when you pass secrets into a function.

```ts {3}
new Function(stack, "MyFunction", {
  handler: "lambda.handler",
  bind: [STRIPE_KEY],
}
```

It adds a Lambda environment variables named `SST_Secret_value_STRIPE_KEY` to the function. The environment variable has a placeholder value `__FETCH_FROM_SSM__` to indicate that the value for `STRIPE_KEY` needs to be fetched from SSM at runtime using [top-level await](https://v8.dev/features/top-level-await).

---

#### Top-level await

At runtime when you import the `Config` package in your function.

```ts
import { Config } from "sst/node/config";
```

It performs a top-level await to fetch and decrypt `STRIPE_KEY` from SSM. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.

:::note
Due to the use of top-level await, your functions need to be bundled in the `esm` format. This is the default in SST v2. [Here's how to set it explicitly](constructs/Function.md#format).
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

#### Updating secrets

Secret values are not refetched on subsequent Lambda function invocations. So if the value of a secret changes while the Lambda container is still warm, it'll hang on to the old value.

To address this, SST forces functions to refetch the secret when its value changes. So when you run:

```bash
npx sst secrets set STRIPE_KEY sk_test_abc123
```

SST looks up all the functions using `STRIPE_KEY`. And for each function, SST sets a Lambda environment variable named `SST_ADMIN_SECRET_UPDATED_AT` with the value of the current timestamp. This will trigger the Lambda containers to restart. If a container is in the middle of handling an invocation, it will restart after the invocation is complete.

---

#### Fallback values

Sometimes you might be creating ephemeral stages or preview environments from pull requests. It can be annoying to manually set the value of a secret for these stages especially because they might all be using the same value.

To make this easier, you can set a fallback value for a secret. And if its value isn't set for a stage, it'll use the fallback value instead.

:::tip
Set a fallback value for your secret so you don't have to set them for ephemeral stages.
:::

In the above example, it's likely all the dev stages share the same `STRIPE_KEY`. So set a fallback value by running:

```bash
npx sst secrets set --fallback STRIPE_KEY sk_test_abc123
```

Similar to the `set` command, SST creates an AWS SSM Parameter of the type `SecureString`. And the parameter name in this case is `/sst/{appName}/.fallback/Secret/STRIPE_KEY/value`.

:::info
The fallback value can only be inherited by stages deployed in the same AWS account and region.
:::

If a function uses the `STRIPE_KEY` secret, but neither the secret value or the fallback value has been set, you'll get a runtime error when you import `sst/node/config`.

```
The following secrets were not found: STRIPE_KEY
```

---

### Parameters

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
import { Config } from "sst/node/config";
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

#### Default values

By default the app name and the current stage are also made available in the `Config` object as well.

```ts
import { Config } from "sst/node/config";

Config.APP;
Config.STAGE;
```

---

## Other options

The [`sst/node`](clients/index.md) package only supports Node.js functions. For other runtimes, SST supports loading environment variables using [dotenv](https://github.com/motdotla/dotenv).

---

### dotenv

The `.env` support in SST is similar to what [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#loading-environment-variables) do for environment variables. For example if you add the following `.env` file to your project root.

```bash title=".env"
TABLE_READ_CAPACITY=5
TABLE_WRITE_CAPACITY=5
```

SST will load the `process.env.TABLE_READ_CAPACITY` and `process.env.TABLE_WRITE_CAPACITY` variables into the Node.js environment; automatically allowing you to use them in your CDK code.

:::caution
If you are using JavaScript or TypeScript, it's strongly recommended that you use `Config` instead of `.env`.
:::

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

### How much does it cost to use `Config`?

Secrets and Parameters are stored in AWS SSM with the _Standard Parameter type_ and _Standard Throughput_. This makes `Config` [free to use](https://aws.amazon.com/systems-manager/pricing/) in your SST apps.

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
npx sst secrets set --fallback STRIPE_KEY sk_test_abc123
```

At runtime, the functions are going to pick up the correct value based on the stage, whether they are running locally, inside a test, or in production.

Finally, the `Config` object in your Lambda function handles errors and is typesafe. So unlike `process.env`, `Config.STRIPE_KEY` will autocomplete. And an invalid secret like `Config.XYZ` will throw a runtime error.
