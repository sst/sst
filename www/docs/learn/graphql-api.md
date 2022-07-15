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

### Lambda optimized GraphQL

The GraphQL setup in our starter ships with a Lambda optimized GraphQL server. We've taken care to make sure it's as small as possible to minimize cold starts; while still including what you'll need to ship complete GraphQL APIs. 

Now let's start adding the comments feature to our GraphQL API.
