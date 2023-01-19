---
title: GraphQL API
---

We are now ready to expose the new comments functionality in our core package through an API. You'll recall that we use [GraphQL](https://graphql.org) for our API in our starter.

:::info
We use GraphQL for our API in the `create sst` starter.
:::

You don't need to know a lot about GraphQL upfront, this tutorial can help with that.

---

## What is GraphQL

To start, let's get a quick overview of GraphQL and how we use it in our `create sst` setup.

[GraphQL](https://graphql.org) is a query language for your API that provides more structure than open ended REST APIs.

:::tip Learn GraphQL
If you're interested in learning GraphQL, we recommend [the tutorial in their docs](https://graphql.org/learn/).
:::

---

## Why GraphQL

One of the biggest benefits of using GraphQL is that it can effectively separate your frontend and backend. In the REST API world, if you needed to make a change to the frontend and display some data differently. Or display different data, you needed to think about making a change to the APIs as well.

In the case of GraphQL, you describe all your data, the relationships, and the actions you can carry out on that data once. The frontend can request whatever it needs in a way that makes sense for it.

These benefits become all the more valuable when you have multiple clients. For example, imagine your desktop site shows all the articles along with their comments, while the mobile site only shows the articles. This is easy to do with GraphQL. Each client just specifies what it needs.

GraphQL also has a huge community that has built really great tooling around it for things like code-generation, authorization, logging, and much more.

---

## Code-first GraphQL

In the `create sst` setup we do what's called _Code-first GraphQL_. This means that you write all of your GraphQL API definitions in TypeScript, instead of splitting them across GraphQL files and TS files.

:::info
The `create sst` setup uses an approach called _Code-first GraphQL_.
:::

We use a library called [Pothos](https://pothos-graphql.dev/) to do this. And while it's not the default way to do GraphQL, it's a fantastically productive pattern and we recommend it for everyone. Here are some of the reasons why:

- **Single source of truth**

  Separating your schema from your resolver code usually requires code-generation to keep things in sync. This is a clunky workflow and can feel tedious to maintain things in two places.

  With Pothos you have a single source of truth for both the schema and the implementation. You only have to write the definitions once in TypeScript for your entire application; backend and frontend.

- **First class TypeScript support**

  Pothos is a TypeScript-first library. This means the entire API has been designed to maximize typesafety and inference. You will get useful autocomplete, full typesafety, while having to write very few manual type annotations.

- **Plugin system**

  Pothos comes with a set of [incredibly useful plugins](https://pothos-graphql.dev/docs/plugins). These simplify implementing common patterns like paging, authorization, and more.

In the next chapter we'll look at an example of this and add our new feature to the GraphQL schema, _in code_.

---

## Lambda optimized GraphQL

The GraphQL setup in our starter ships with a Lambda optimized GraphQL server. We've taken care to make sure it's as small as possible to minimize cold starts; while still including what you'll need to ship complete GraphQL APIs.

<details>
<summary>Behind the scenes</summary>

Let's take a look at how this is all wired up.

1. First, as we talked about in [Project Structure](project-structure.md#stacks) chapter, our GraphQL API is defined in `stacks/Api.ts`.

   ```ts titlte="stacks/Api.ts"
   routes: {
     "POST /graphql": {
       type: "pothos",
       function: {
         handler: "functions/graphql/graphql.handler",
       },
       schema: "services/functions/graphql/schema.ts",
       output: "graphql/schema.graphql",
       commands: [
         "npx genql --output ./graphql/genql --schema ./graphql/schema.graphql --esm",
       ],
     },
   },
   ```

   Our API has a single route at `/graphql`. It's an [`ApiPothosRouteProps`](../constructs/Api.md#apipothosrouteprops).

   Let's look at what we are configuring here:

   - The `handler` points to where the Lambda function is.
   - The `schema` is the reference to a GraphQL schema. More on this in a second.
   - The `output` is where Pothos outputs the GraphQL schema to a file. By writing to a file, we are able to use other tools in the GraphQL ecosystem.
   - Finally, the `commands` let you specify any scripts you want to run after the schema has been generated. We'll look at what we are running below.

2. The GraphQL schema is specified in `services/functions/graphql/schema.ts`.

   ```ts title="services/functions/graphql/schema.ts"
   import { builder } from "./builder";

   import "./types/article";

   export const schema = builder.toSchema({});
   ```

   It's doing two things:

   1. Get the Pothos [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder) that we define in `services/functions/graphql/builder.ts`.

      ```ts title="services/functions/graphql/builder.ts"
      import SchemaBuilder from "@pothos/core";

      export const builder = new SchemaBuilder({});

      builder.queryType({});
      builder.mutationType({});
      ```

      This creates a new instance that we'll use to build out our GraphQL schema.

   2. Import all our GraphQL schema types. Right now we only have the one for our article, `./types/article`. These use the `builder` from above to build out our schema. We'll look at this in detail in the [next chapter](add-api-types.md).

   3. Finally, get the GraphQL schema from Pothos by running `builder.toSchema()`.

3. We then pass the GraphQL schema into the Lambda optimized GraphQL handler, `GraphQLHandler`, that we talked about above.

   It's defined in `services/functions/graphql/graphql.ts`.

   ```ts title="services/functions/graphql/graphql.ts"
   import { schema } from "./schema";
   import { GraphQLHandler } from "sst/node/graphql";

   export const handler = GraphQLHandler({
     schema,
   });
   ```

4. Finally, we are running a script after our schema has been generated.

   ```bash
   npx genql --output ./graphql/genql --schema ./graphql/schema.graphql --esm
   ```

   We are using [Genql](https://genql.vercel.app), to generate a typed GraphQL client to the `--output` directory. It uses the GraphQL schema that Pothos generates in the `--schema` directory. We'll be using this later in our frontend React app.

   We internally have a watcher that regenerates the typed frontend client when we make changes to our Pothos schema. So the pipeline looks like:

   1. Detect changes in the Pothos schema.
   2. Generate a standard GraphQL schema.
   3. Generate our typed frontend GraphQL client from the schema.

</details>

---

Now let's expose the comments feature with our GraphQL API.
