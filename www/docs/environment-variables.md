---
title: Environment Variables
description: "Working with environment variables in Serverless Stack (SST)"
---

SST has built-in support for loading environment variables from a `.env` file into `process.env` using [dotenv](https://github.com/motdotla/dotenv).

This is similar to what [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#loading-environment-variables) do for environment variables.

For example if you add the following `.env` file to your project root.

```bash title=".env"
TABLE_READ_CAPACITY=5
TABLE_WRITE_CAPACITY=5
```

SST will load the `process.env.TABLE_READ_CAPACITY` and `process.env.TABLE_WRITE_CAPACITY` variables into the Node.js environment; automatically allowing you to use them in your CDK code.

## Types of `.env` files

Aside from the default `.env` file, there are a couple of other types of `.env` files. You can use them to better organize the environment variables in your SST app.

#### `.env.$STAGE`

You can add a `.env.$STAGE` file to override the default values for a specific stage. For example, this overrides the value for the `prod` stage:

```bash title=".env.prod"
TABLE_READ_CAPACITY=20
```

#### `.env*.local`

You can also add `.env.local` and `.env.$STAGE.local` files to set up environment variables that are specific to your local machine.

#### `.env.test`

For your tests, you can add a `.env.test` file to override the default values when running `npx sst test`.

#### Priority

Here's the priority in which these files are loaded. Starting with the one that has the highest priority.

1. `.env.dev.local`
2. `.env.dev`
3. `.env.local`
4. `.env`

Assume that the current stage is `dev`.

And here's the priority when running your tests.

1. `.env.test`
2. `.env.local`
3. `.env`

## Committing `.env` files

The `.env`, `.env.$STAGE`, and `.env.test` files can be committed to your Git repository. On the other hand, the `.env.local` and `.env.$STAGE.local` shouldn't.

The `.env*.local` files are meant to specify sensitive information specific to your machine. They should be ignored through the `.gitignore` file.

:::caution
Don't commit any `.env` files to Git that contain sensitive information.
:::

Note that, SST doesn't enforce these conventions. They are just guidelines that you can use to organize your environment variables. Similar to the ones used by [Create React App](https://create-react-app.dev/docs/adding-custom-environment-variables/#adding-development-environment-variables-in-env) and [Next.js](https://nextjs.org/docs/basic-features/environment-variables#default-environment-variables).


## Expanding variables

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

## Other environment variables

The `.env` environment variables will not modify an environment variable that has been previously set. So if you run the following:

```bash
NAME=Spongebob npx sst deploy
```

While your `.env` has.

```bash
NAME=Patrick
```

The `.env` value will be ignored and `process.env.NAME` will be set to `Spongebob`.

## Environment variables in Seed

The above idea also applies to environment variables that are set in [Seed](https://seed.run) or other CIs. If you have an [environment variable set in Seed](https://seed.run/docs/storing-secrets), it'll override the one you have set in your `.env` files.

## Environment variables in Lambda functions

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

```js title="lib/index.js"
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

``` js title="lib/MyStack.js" {6}
export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Increase the timeout locally
    const timeout = process.env.IS_LOCAL
      ? 900
      : 15;

    // Rest of the resources
  }
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

## Working with secrets

While it is common to use `.env*.local` files to store sensitive information (and not committing them to Git); the recommended way to work with secrets is to use [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) (SSM).

In this section let's compare the different ways secrets can be managed in SST. You can compare the different strategies and select the one that is right for you.

#### 1. Use the `.env*.local` files

- **Usage in CDK**: Reference via the the `process.env`
- **Usage in Lambda**: Set via the [Function's](constructs/Function.md) `environment` prop
- **Local usage**: Store the secret in the `.env*.local` files that aren't committed to Git
- **CI usage**: Store the secrets in the CI's dashboard
- **Security**: _GOOD_, but the secrets are exposed to the CI providers and exposed in the CloudFormation template

#### 2. Fetch SSM values in CDK using the AWS SDK

- **Usage in CDK**: Use the AWS SDK to fetch the SSM values
- **Usage in Lambda**: Set via the [Function's](constructs/Function.md) `environment` prop
- **Local usage**: Store the SSM paths in a `.env` file
- **CI usage**: SSM paths loaded from the `.env` file
- **Security**: _BETTER_, secrets are not exposed to CI providers, but they are displayed in plain text in Lambda console and the CloudFormation template

#### 3. Fetch SSM values in Lambda using the AWS SDK

- **Usage in CDK**: Cannot be used in CDK since it is resolved on deploy
- **Usage in Lambda**: Fetch the SSM values inside a Lambda function using the AWS SDK
- **Local usage**: Store the SSM paths in a `.env` file
- **CI usage**: SSM paths loaded from the `.env` file
- **Security**: _BEST_, secrets are not exposed to CI providers, Lambda console, or the CloudFormation template

In summary, while approach #1 is the easiest it is also the least secure. On the other hand #3 is the most secure but is not as easy to implement. We recommend using `.env` for variables that aren't as sensitive and relying on SSM for the most sensitive values.
