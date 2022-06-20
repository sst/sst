---
title: Project Structure
---

Running the [`create sst`](../packages/create-sst.md) command bootstraps your project with a full-stack starter.

Your project structure will look something like this.

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

Let's look at what's in the starter in a little more detail.

### `stacks/`

The `stacks/` directory contains the app's infrastructure as defined in code. Or what is known as [Infrastructure as Code](https://serverless-stack.com/chapters/what-is-infrastructure-as-code.html) (IaC). SST by default uses TypeScript to define your infrastructure, but you can also use JavaScript.

We typically group related resources together into stacks. In the `stacks/` directory there are a couple of files:

- `index.ts` defines all the stacks in the app. You can use it to setup global defaults for your app and then initialize your stacks.
- `Database.ts` creates a PostgreSQL database cluster using [RDS](https://aws.amazon.com/rds/).
- `Api.ts` creates an API with a GraphQL endpoint at `/graphql` using [API Gateway](https://aws.amazon.com/api-gateway/).
- `Web.ts` creates a static site hosted on [S3](https://aws.amazon.com/s3/), and serves the contents through a CDN using [CloudFront](https://aws.amazon.com/cloudfront/).

### `services/`

The `services/` directory houses everything that powers your backend. This includes your GraphQL API but also all your business logic, other functions, and whatever else you need.

- `services/core` contains all of your business logic. `create-sst` encourages Domain Driven Design so that you keep your business logic seperate from your API and Lambda functions. This allows you to write simple, reusable code that implements all the things your application can do which are then called by external facing services - like an API.

- `services/functions` is where you can place all the code for your functions. Your functions should generally be fairly simple and mostly be calling into code defined in `services/core`.

- `services/functions/graphql` is a predefined function and the supporting code that serves up a GraphQL API. It is wired up for code-generation and connected to an API construct defined in `stacks`.

- `services/migrations` is created by default to house your SQL Migrations. The starter includes provisions a RDS instance. But you can delete or ignore this if you're opting to use a different database like DynamoDB.

### `graphql/`

The `graphql/` directory will contain the outputs of GraphQL related code generation. Typically you won't be touching this. It contains code shared between the frontend and backend tests that query the GraphQL API.

### `web/`

The `web/` directory contains a React application created with [Vite](https://vitejs.dev/). It's already wired up to be able to talk to the GraphQL API. If you are using a different frontend, for example NextJS, you can delete this folder and provision it yourself.

### `sst.json`

Finally, the `sst.json` contains the project config.

```json title="sst.json"
{
  "name": "my-sst-app",
  "region": "us-east-1",
  "main": "stacks/index.ts"
}
```

Let's look at these options in detail.

- **name** is  the name of your application and is used to prefix stack and resource names.

- **region**, is the default region your app is deployed to. It can be overridden using the [`--region`](packages/cli.md#--region) CLI option.

- **main** is the entry point to your SST app. Defaults to `stacks/index.ts`.

Note that, you can access the **stage**, **region**, and **name** in the entry point of your app.

```js title="stacks/index.ts"
export default function(app: App) {
  app.stage; // "dev"
  app.region; // "us-east-1"
  app.name; // "my-sst-app"
}
```

You can also access them in your stacks.

```js title="stacks/MyStack.ts"
export function ApiStack({ app }: StackContext) {
  app.stage; // "dev"
  app.region; // "us-east-1"
  app.name; // "my-sst-app"
}
```

Next let's set up our code editor to work on our SST app.
