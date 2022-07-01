---
title: GraphQL API
---

We are now ready to expose the new comments functionality that we added to our core package. Let's look at how the API works in the `create sst` starter.

[GraphQL](https://graphql.org) is a fundamental part of the starter but you don't need to know anything about it ahead of time. As you follow this tutorial you'll pick up the concepts you need.

### What is GraphQL

GraphQL is a query language for your API that provides a bit more structure than open ended REST APIs. It has a huge community that has built really great tooling around it for things like code-generation, authorization, logging, and much more. If you're interested in learning more you can read about it in [their docs](https://graphql.org/learn/)

### Code first GraphQL

In our setup, we use [Pothos](https://pothos-graphql.dev/) to do what is called _Code first GraphQL_. What this means is that you write all of your GraphQL API definitions in TypeScript, instead of splitting them across GraphQL files and TS files. It is a fantastically productive pattern and we recommend it for everyone. Here are some of the reasons why:

- **First class TypeScript support**

  Pothos is a TypeScript first library. This means the entire API has been designed to maximize type-safety and inference. You will get useful autocomplete, full type-safety, while having to write very few manual type annotations.

- **Single source of truth**

  Separating your schema from your resolver code usually requires code-generation to keep things in sync. This is a clunky workflow and can feel tedious to maintain things in two places. With Pothos you have a single source of truth for both the schema and the implementation.

- **Plugin system**

  Pothos comes with a set of [incredibly useful plugins](https://pothos-graphql.dev/docs/plugins). These simplify implementing common patterns like paging, authorization, and more.

### Lambda optimized

The GraphQL setup in our starter ships with a Lambda optimized GraphQL server. We've taken care to make sure it's as small as possible to minimize cold starts. While still including what you'll need to ship complete GraphQL APIs. 

Now let's start by adding the types for our new comments feature.
