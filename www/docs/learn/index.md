---
title: Learn SST
sidebar_label: Preface
description: "Learn how to build your first full-stack application with SST."
---

import config from "../../config";

We created this tutorial to help you build your first app with SST!

We'll cover most of the key concepts of SST by adding a new feature to an app. You'll get a feel for how SST works and we'll end by deploying the app to production!

:::tip
Before you start, join our community on <a href={ config.discord }><b>Discord</b></a>. We'll be around to help you.
:::

You might have some questions as you work through this tutorial. Don't worry, we are around to help. Join our community over on <a href={ config.discord }>Discord</a>.

### What are we building

The starter we'll be using creates a very simple Reddit clone called _"Links"_. You can submit an article to it and it'll display all the articles that've been submitted.

We'll then walk through the process of adding a new feature. We'll allow our users to add comments for these links!

:::info
This tutorial should take less than an hour. We recommend going through it once.
:::

Let's look at what we'll be covering.

### What are we covering

We've structured this tutorial in a way that shows you what the development workflow looks like while working with SST. We start with setting up your local development environment and go all the way to "git push to deploy" in production.

:::tip
If you want to get started right away, you can jump ahead to the next chapter — [**Create a new SST project**](create-a-new-project.md)
:::

Here's roughly what we'll be covering in the next few chapters:

1. Creating a new SST app
2. Setting up your local dev environment
3. Writing to a database
4. Connecting it to your API
5. Rendering it in the frontend
6. Deploying to production

### What's in the starter

Our _Links_ app is based on a starter that we recommend for building full-stack serverless applications. At a very high level, we are using the following:

- SST's constructs to define our infrastructure
- PostgreSQL (or DynamoDB) for our database
- GraphQL for the API
- React for our frontend

We also use a couple of other notable open-source libraries in our setup.

- [Kysely](https://koskimas.github.io/kysely), a type-safe TypeScript SQL query builder
- [ElectroDB](https://github.com/tywalch/electrodb), a type-safe TypeScript library for DynamoDB
- [Pothos](https://pothos-graphql.dev), a type-safe TypeScript GraphQL schema builder

You might've guessed that we really care about type-safety!

End-to-end type-safety, is one of the defining features of SST. Everything including our frontend, backend, GraphQL schema definitions, environment variables, and infrastructure is type-safe. It helps us prevent any mistakes, and it also allows our editors to auto-complete our code!

### How to get help

Alright, we are ready to get started!
