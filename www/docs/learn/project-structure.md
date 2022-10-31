---
title: Project Structure
---

While we wait for our local environment to start up, let's look at the starter the [`create sst`](../packages/create-sst.md) CLI has set up for us.

:::tip
This chapter goes into a lot of detail to help you get familiar with this setup.

If you are just trying to get an overview of SST, feel free to skim this chapter and skip ahead.
:::

---

## Monorepo

Your project will look something like this.

```
my-sst-app
├─ sst.json
├─ services
│  ├─ core
│  ├─ functions
│  │  └─ graphql
│  └─ migrations
├─ graphql
├─ stacks
└─ web
```

We are using a monorepo setup. We recommend using it because it's the best way to manage a growing project with interconnected parts (like the backend, frontend, and infrastructure).

It may seem a bit heavy upfront but it makes it easy to add new features while keeping things organized.

:::info
The `create sst` setup generates a [monorepo](https://en.wikipedia.org/wiki/Monorepo) + [Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) setup.
:::

We'll look at how our monorepo is split up with [Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) below. But first, let's start by looking at what these directories do.

---

## `stacks/`

The `stacks/` directory contains the app's infrastructure as defined as code. Or what is known as [Infrastructure as Code](https://sst.dev/chapters/what-is-infrastructure-as-code.html) (IaC). SST by default uses TypeScript to define your infrastructure. You can also use JavaScript.

We typically group related resources together into stacks. In the `stacks/` directory there are a couple of files:

- `Database.ts` creates a PostgreSQL database cluster.

  ```ts title="stacks/Database.ts"
  export function Database({ stack }: StackContext) {
    const rds = new RDS(stack, "rds", {
      engine: "postgresql11.13",

    // ...
  ```

  Stacks also allow us to return props that we can reference in other stacks.

  ```ts
  return rds;
  ```

- `Api.ts` creates an API with a GraphQL endpoint at `/graphql` using [API Gateway](https://aws.amazon.com/api-gateway/).

  ```ts title="stacks/Api.ts"
  export function Api({ stack }: StackContext) {
    const db = use(Database);

    const api = new ApiGateway(stack, "api", {

    // ...
  ```

  The `use(Database)` call gives this stack access to the props that the `Database` stack returns. So `rds` is coming from the return statement of our `Database` stack.

  We _bind_ the database to our API so that the functions that power our API have access to it.

  ```ts {2}
  function: {
    bind: [rds],
  },
  ```

  The `bind` prop does two things for us. It gives our functions permissions to access the database. Also our functions are loaded with the database details required to query it. You can [read more about Resource Binding](../resource-binding.md).

- `Web.ts` creates a [Vite](https://vitejs.dev) static site hosted on [S3](https://aws.amazon.com/s3/), and serves the contents through a CDN using [CloudFront](https://aws.amazon.com/cloudfront/).

  ```ts title="stacks/Web.ts"
  export function Web({ stack }: StackContext) {
    const api = use(Api);

    const site = new ViteStaticSite(stack, "site", {

    // ...
  ```

  We get the `Api` stack to set the GraphQL API URL as an environment variable for our frontend to use.

  ```ts {2}
  environment: {
    VITE_GRAPHQL_URL: api.url + "/graphql",
  },
  ```

- Finally, `index.ts` defines all the stacks in the app.

  ```ts title="stacks/index.ts"
  export default function main(app: App) {
    // ...

    app.stack(Database).stack(Api).stack(Web);
  }
  ```

---

## `services/`

The `services/` directory houses everything that powers our backend. This includes our GraphQL API, but also all your business logic, and whatever else you need.

- `services/core` contains all of your business logic. The `create sst` setup encourages [Domain Driven Design](domain-driven-design.md). It helps you keep your business logic separate from your API and Lambda functions. This allows you to write simple, maintainable code. It implements all the things your application can do. These are then called by external facing services — like an API.

- `services/functions` is where you can place all the code for your Lambda functions. Your functions should generally be fairly simple. They should mostly be calling into code previously defined in `services/core`.

- `services/functions/graphql` is a predefined function and it includes supporting code that serves up a GraphQL API. It's wired up for code-generation and connected to the API defined in `stacks/Api.ts`.

- `services/migrations` is created by default to house your SQL migrations.

:::info
Our starter is structured to encourage [Domain Driven Design](domain-driven-design.md).
:::

---

## `graphql/`

The `graphql/` directory will contain the outputs of GraphQL related code generation. Typically you won't be touching this but it needs to be committed to Git. It contains code shared between the frontend and backend.

---

## `web/`

The `web/` directory contains a React application created with [Vite](https://vitejs.dev/). It's already wired up to be able to talk to the GraphQL API. If you are using a different frontend, for example NextJS, you can delete this folder and provision it yourself.

---

## `package.json`

The `package.json` for our app is relatively simple. But there are a couple of things of note.

---

### Workspaces

As we had mentioned above, we are using [Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) to organize our monorepo setup.

Workspaces are now supported in both [npm](https://docs.npmjs.com/cli/v7/using-npm/workspaces) and [Yarn](https://classic.yarnpkg.com/lang/en/docs/workspaces/) and you can learn more about them in their docs. In a nutshell, they help you manage dependencies for separate _packages_ inside your repo that have their own `package.json` files.

We have three workspaces in our setup.

```json title="package.json"
"workspaces": [
  "services",
  "graphql",
  "web"
]
```

You'll notice that all these directories have their own `package.json` file.

So when you need to install/uninstall a dependency in one of those workspaces, you can do the following from the project root.

```bash
$ npm install <package> -W <workspace>
$ npm uninstall <package> -W <workspace>
```

Or you can do the regular `npm install` in the workspace's directory.

For Yarn, you'll need to run `yarn add` in the workspace directory. And at the root you'll need to run `yarn add` with [the `-W` flag](https://classic.yarnpkg.com/lang/en/docs/cli/add/).

---

### Scripts

Our starter also comes with a few helpful scripts.

```json title="package.json"
"scripts": {
  "start": "sst start",
  "build": "sst build",
  "deploy": "sst deploy",
  "remove": "sst remove",
  "console": "sst console",
  "typecheck": "tsc --noEmit",
  "test": "sst bind -- vitest run",
  "gen": "hygen"
},
```

Here's what these scripts do:

- `start`: Start the [Live Lambda Dev](../live-lambda-development.md) environment for the _default_ stage.
- `build`: Build the [CloudFormation](https://aws.amazon.com/cloudformation/) for the infrastructure of the app for the _default_ stage. It converts the SST constructs to CloudFormation and packages the necessary assets, but it doesn't deploy them. This is helpful to check what's going to be deployed without actually deploying it.
- `deploy`: Build the infrastructure and deploy the app to AWS.
- `remove`: Completely remove the app's infrastructure from AWS for the _default_ stage. Use with caution!
- `console`: Start the [SST Console](../console.md) for the _default_ stage. Useful for managing _non-local_ stages.
- `typecheck`: Run typecheck for the entire project. By default, our editor should automatically typecheck our code using the `tsconfig.json` in our project root. However, this script lets you explicitly run typecheck as a part of our CI process.
- `test`: Load our `Config` and run our tests. Our starter uses [Vitest](https://vitest.dev).
- `gen`: Uses [Hygen](http://www.hygen.io) to run built-in code gen tasks. Currently only supports `npm run gen migration new`. This will help you code gen a new migration.

:::note
The _default_ stage that we are referring to above, is the one that you selected while first [creating the app](create-a-new-project.md).
:::

This might seem like a lot of scripts but we don't need to worry about them now. We'll look at them in detail when necessary.

---

## `sst.json`

Finally, the `sst.json` contains the project config.

```js title="sst.json"
{
  // The name of your app, is used to prefix stack and resource names.
  "name": "my-sst-app",
  // The default region your app is deployed to.
  // Can be overridden using the `--region` CLI option
  "region": "us-east-1",
  // The entry point to your app, defaults to `stacks/index.ts`.
  "main": "stacks/index.ts"
}
```

---

By now your `sst start` process should be complete. So let's run our first migration and initialize our database!
