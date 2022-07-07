---
title: Project Structure
---

While we wait for our [Live Lambda Dev](../live-lambda-development.md) environment to start up, let's look at the starter the [`create sst`](../packages/create-sst.md) CLI setup for us.

:::info
The `create sst` setup is structured to encourage [Domain Driven Design](domain-driven-design.md).
:::

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

Let's look at these directories in a little more detail.

### `stacks/`

The `stacks/` directory contains the app's infrastructure as defined in code. Or what is known as [Infrastructure as Code](https://sst.dev/chapters/what-is-infrastructure-as-code.html) (IaC). SST by default uses TypeScript to define your infrastructure (you can also use JavaScript).

We typically group related resources together into stacks. In the `stacks/` directory there are a couple of files:

- `Database.ts` creates a PostgreSQL database cluster (if you used the [RDS](https://aws.amazon.com/rds/) option in the last chapter).

  ```ts title="stacks/Database.ts"
  export function Database({ stack }: StackContext) {
    const rds = new RDS(stack, "rds", {
      engine: "postgresql10.14",

    // ...
  ```

- `Api.ts` creates an API with a GraphQL endpoint at `/graphql` using [API Gateway](https://aws.amazon.com/api-gateway/).

  ```ts title="stacks/Api.ts"
  export function Api({ stack }: StackContext) {
    const db = use(Database);

    const api = new ApiGateway(stack, "api", {

    // ...
  ```

  We pass in the database stack to it so that the functions in our GraphQL API have access to it.

  ```ts
  function: {
    permissions: [db],
    environment: {
      RDS_SECRET_ARN: db.secretArn,
      RDS_ARN: db.clusterArn,
      RDS_DATABASE: db.defaultDatabaseName,
    },
  },
  ```

- `Web.ts` creates a static site hosted on [S3](https://aws.amazon.com/s3/), and serves the contents through a CDN using [CloudFront](https://aws.amazon.com/cloudfront/).

  ```ts title="stacks/Web.ts"
  export function Web({ stack }: StackContext) {
    const api = use(Api);

    const site = new ViteStaticSite(stack, "site", {

    // ...
  ```

  We pass in the API to it so we can set the API URL as an environment variable in our frontend.

  ```ts
  environment: {
    VITE_GRAPHQL_URL: api.url + "/graphql",
  },
  ```

- Finally, `index.ts` defines all the stacks in the app. We also use it to setup global defaults for our app.

  ```ts title="stacks/index.ts"
  export default function main(app: App) {
    app.setDefaultFunctionProps({
      runtime: "nodejs16.x",
      srcPath: "services",
    });
    app.stack(Database).stack(Api).stack(Web);
  }
  ```

### `services/`

The `services/` directory houses everything that powers your backend. This includes your GraphQL API, but also all your business logic, other functions, and whatever else you need.

- `services/core` contains all of your business logic. The `create sst` setup encourages [Domain Driven Design](domain-driven-design.md). It helps you keep your business logic separate from your API and Lambda functions. This allows you to write simple, reusable code, that implements all the things your application can do. These are then called by external facing services — like an API.

- `services/functions` is where you can place all the code for your Lambda functions. Your functions should generally be fairly simple and mostly be calling into code previously defined in `services/core`.

- `services/functions/graphql` is a predefined function and it includes supporting code that serves up a GraphQL API. It's wired up for code-generation and connected to an API construct defined in `stacks/Api.ts`.

- `services/migrations` is created by default to house your SQL migrations. You can delete or ignore this if you're opting to use a different database like DynamoDB.

### `graphql/`

The `graphql/` directory will contain the outputs of GraphQL related code generation. Typically you won't be touching this. It contains code shared between the frontend and backend that queries the GraphQL API.

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

#### Config options

Let's look at these options in detail.

- **name** is  the name of your application and is used to prefix stack and resource names.

- **region** is the default region your app is deployed to. It can be overridden using the [`--region`](../packages/cli.md#--region) CLI option.

- **main** is the entry point to your SST app. It defaults to `stacks/index.ts`.

Note that, you can access the **stage**, **region**, and **name** in the entry point of your app.

```js title="stacks/index.ts"
export default function(app: App) {
  app.stage;  // "dev"
  app.region; // "us-east-1"
  app.name;   // "my-sst-app"
}
```

You can also access them in your stacks.

```js title="stacks/MyStack.ts"
export function ApiStack({ app }: StackContext) {
  app.stage;  // "dev"
  app.region; // "us-east-1"
  app.name;   // "my-sst-app"
}
```

Next, let's set up our code editor to work with our SST app.
