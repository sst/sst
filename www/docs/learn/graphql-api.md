---
title: GraphQL API
---

We are now ready to expose the new comments functionality that we added to our core package. We use [GraphQL](https://graphql.org) for our API in the `create sst` starter. 

:::info
We use GraphQL for our API in the `create sst` starter.
:::

You don't need to know a lot about GraphQL upfront, this tutorial and our starter can help with that. Before we look at how to write the API for our comments feature, let's get a quick overview of GraphQL and how we use it in our `create sst` setup.

### What is GraphQL

[GraphQL](https://graphql.org) is a query language for your API that provides a more structure than open ended REST APIs.

:::tip Learn GraphQL
If you're interested in learning GraphQL, we recommend their [the tutorial in their docs](https://graphql.org/learn/).
:::

GraphQL has a huge community that's built really great tooling around it for things like code-generation, authorization, logging, and much more.

### Code-first GraphQL

In the `create sst` setup we do what's called _Code-first GraphQL_. This means that you write all of your GraphQL API definitions in TypeScript, instead of splitting them across GraphQL files and TS files.

:::info
The `create sst` setup uses an appropach called _Code-first GraphQL_.
:::

We use a library called [Pothos](https://pothos-graphql.dev/) to do this. And while it's not the default way to do GraphQL, it's a fantastically productive pattern and we recommend it for everyone. Here are some of the reasons why:

- **Single source of truth**

  Separating your schema from your resolver code usually requires code-generation to keep things in sync. This is a clunky workflow and can feel tedious to maintain things in two places.

  With Pothos you have a single source of truth for both the schema and the implementation. You only have to write the definitions once in TypeScript for your entire application; backend and frontend.

- **First class TypeScript support**

  Pothos is a TypeScript-first library. This means the entire API has been designed to maximize type-safety and inference. You will get useful autocomplete, full type-safety, while having to write very few manual type annotations.

- **Plugin system**

  Pothos comes with a set of [incredibly useful plugins](https://pothos-graphql.dev/docs/plugins). These simplify implementing common patterns like paging, authorization, and more.

### Creating a code-first schema

Let's look at how we build a GraphQL schema with Pothos. We define the type for our article in `services/functions/graphql/types/article.ts`. We'll get into the details of this in the next chapter but for now, let's look at the 3 main aspects of it.

1. Define the article type. 

   ```ts title="services/functions/graphql/types/article.ts"
   const ArticleType = builder.objectRef<SQL.Row["article"]>("Article").implement({
     fields: (t) => ({
       id: t.exposeID("articleID"),
       title: t.exposeID("title"),
       url: t.exposeID("url"),
     }),
   });
   ```

2. Use the type, and the SQL call from the [Write to PostgreSQL](write-to-postgresql.md) chapter to implement the query.

   ```ts
   builder.queryFields((t) => ({
     articles: t.field({
       type: [ArticleType],
       resolve: () => Article.list(),
     }),
   }));
   ```

3. Define a mutation that creates an article. This also uses the SQL call that we implemented in `services/core/` before. 

   ```ts
   builder.mutationFields((t) => ({
     createArticle: t.field({
       type: ArticleType,
       args: {
         title: t.arg.string({ required: true }),
         url: t.arg.string({ required: true }),
       },
       resolve: (_, args) => Article.create(args.title, args.url),
     }),
   }));
   ```

The `builder` here is an instance of a Pothos [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder). We'll look at how this is all wired up below.

### Lambda optimized GraphQL

The GraphQL setup in our starter ships with a Lambda optimized GraphQL server. We've taken care to make sure it's as small as possible to minimize cold starts; while still including what you'll need to ship complete GraphQL APIs. 

:::info Behind the scenes
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
      - The `schema` is the code version of the Pothos _code-first_ schema. More on this in a second.
      - The `output` is where the Pothos schema, when run, generates a standard GraphQL schema.
      - Finally, the `commands` let you specify any scripts you want to run after the schema has been generated. We'll look at what we are running below.

2. The Pothos schema is specified in `services/functions/graphql/schema.ts`.

   ``` ts title="services/functions/graphql/schema.ts"
   import { builder } from "./builder";
   
   import "./types/article";
   
   export const schema = builder.toSchema({});
   ```

   It's doing two things:

     1. Creating an instance of the Pothos [`SchemaBuilder`](https://pothos-graphql.dev/docs/guide/schema-builder). This is defined in `services/functions/graphql/builder.ts`.

        ``` ts title="services/functions/graphql/builder.ts"
        import SchemaBuilder from "@pothos/core";
        
        export const builder = new SchemaBuilder({});
        
        builder.queryType({});
        builder.mutationType({});
        ```

    2. Use the builder to define all our GraphQL schema types from the `services/functions/graphql/types/` directory. Right now we only have the the article type that we covered above.


3. We then pass this schema into the Lambda optimized GraphQL handler, `createGQLHandler`, that we talked about above.

   It's defined in `services/functions/graphql/graphql.ts`.

   ```ts title="services/functions/graphql/graphql.ts"
   import { schema } from "./schema";
   import { createGQLHandler } from "@serverless-stack/node/graphql";
   
   export const handler = createGQLHandler({
     schema
   });
   ```

4. Finally, we are running a script after our schema has been generated.

   ```bash
   npx genql --output ./graphql/genql --schema ./graphql/schema.graphql --esm
   ```
 
   We are using [Genql](https://genql.vercel.app), to generate a typed GraphQL client to the `--output` directory. It use the GraphQL schema that our Pothos schema generates in the `--schema` directory. We'll be using this later in our frontend React app. 
 
   We internally have a watcher that regenerates the typed frontend client when we make changes to our Pothos schema. So the pipline looks like:

   1. Detect changes in the Pothos schema
   2. Generate a standard GraphQL schema
   3. Generate our typed frontend GraphQL client.
:::

Now let's start adding the comments feature to our GraphQL API.
