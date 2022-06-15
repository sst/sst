---
id: graphql-api
title: GraphQL API
description: "Using GraphQL API for an SST app"
---

GraphQL is a fundamental part of the `create-sst` starter but you do not need to know anything about it ahead of time. As you follow this guide you will pick up the concepts needed to ship your product.

### What is GraphQL

GraphQL is a query language for your API that provides a bit more structure than open ended REST APIs. It has a huge community that has built really great tooling around it for things like code-generation, authorization, logging, and much more. If you're interested in learning more you can read about it in [their docs](https://graphql.org/learn/)

### Code First GraphQL

In our setup, we use [pothos](https://pothos-graphql.dev/) to do what is called "Code first GraphQL". What this means is you write all of your GraphQL API definitions in Typescript instead of splitting them between GraphQL files and TS files. It is a fantastically productive pattern and is what we recommend for everyone. Some of the benefits:

- **First class Typescript support**: Pothos is a Typescript first library. This means the entire API has been designed to maximize typesafety and inference. You will get useful autocomplete, full type-safety while having to write very few manual type annotations.
- **Single source of truth** Seperating your schema from your resolver code usually requires code-generation to keep things in sync. This is a clunky workflow and can feel tedious to maintain things in two places. With Pothos you have a single source of truth for both the schema and the implementation.
- **Plugin system** Pothos comes with a set of [incredibly useful plugins](https://pothos-graphql.dev/docs/plugins). These simplify implementing common patterns like paging, authorization, and more.

### Lambda Optimized

Our GraphQL setup ships with a lambda optimized GraphQL server. We've taken care to make sure it is as small as possible to minimize cold starts while still including what you'll need to ship complete GraphQL APIs. 
