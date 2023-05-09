---
title: Learn SST
description: "Learn how to build your first full-stack application with SST."
---

import config from "../../config";
import styles from "../video.module.css";

We created this tutorial to help you build your first app with SST.

We'll cover most of the key concepts of SST by working on an app. You'll get a feel for how SST works and we'll end by deploying the app to production!

:::tip
Before you start, join our community on <a href={ config.discord }><b>Discord</b></a>. We are always around to answer any questions!
:::

---

## What are we building

The starter we'll be using creates a very simple Reddit clone called _"Links"_. You can submit an article to it and it'll display all the articles that've been submitted.

![Completed SST app](/img/learn/completed-sst-app.png)

We'll then walk through the process of adding a new feature. We'll allow our users to add comments for these links!

:::tip
The source for the app we are builing is on GitHub for reference — [github.com/serverless-stack/tutorial-links-app](https://github.com/serverless-stack/tutorial-links-app)
:::

Let's look at what we'll be covering.

---

## What are we covering

We've structured this tutorial in a way that shows you what the development workflow looks like while working with SST. We start with setting up your local development environment and go all the way to _"git push to deploy"_ in production.

:::info
This tutorial should take less than an hour. We recommend going through it once.
:::

Here's roughly what we'll be covering in the next few chapters:

1. Creating a new SST app
2. Setting up your local dev environment
3. Writing to a database
4. Connecting it to your API
5. Rendering it in the frontend
6. Deploying to production

---

## What is in the starter

Our _Links_ app is based on a starter that we recommend for building full-stack serverless applications. At a very high level, we are using the following:

- SST's constructs to define our infrastructure
- PostgreSQL for our database
- GraphQL for the API
- React for our frontend

:::info
You might be curious why this is our stack of choice. We care deeply about helping you create a codebase that are flexible, maintainable, and a joy to work with.

SST's ideal user is a startup that's hoping to grow from a simple idea to a large enterprise. We want to pick technologies and methodologies that help with this.

Throughout this tutorial we'll try to highlight the thinking behind our choices.
:::

We also use a couple of other notable open-source libraries in our setup.

---

### Other libraries

- [Kysely](https://kysely-org.github.io/kysely/), a typesafe TypeScript SQL query builder
- [Pothos](https://pothos-graphql.dev), a typesafe TypeScript GraphQL schema builder
- [Urql](https://formidable.com/open-source/urql/) with [Genql](https://genql.vercel.app), a typesafe GraphQL client

The starter we are using is in _TypeScript_ and so is this tutorial. You might've guessed that we really care about typesafety!

:::info
End-to-end typesafety is one of the defining features of SST.
:::

Everything from our frontend components, backend, schema definitions, environment variables, and infrastructure is typesafe. It helps us prevent any mistakes, and allows our editors to autocomplete our code!

---

## Why TypeScript

Aside from all the autocomplete goodness, typesafety ends up being critical for the maintainability of codebases. This matters if you are planning to work with the same codebase for years to come.

It should be easy for your team to come in and make changes to parts of your codebase that have not been worked on for a long time. TypeScript allows you to do this! Your codebase no longer feels _brittle_ and you are not afraid to make changes.

---

### TypeScript made easy

If you are not used to TypeScript, you might be wondering, _"Don't I have to write all these extra types for things?"_ or _"Doesn't TypeScript make my code really verbose and scary?"_.

These are valid concerns. But it turns out, if the libraries you are using are designed well for TypeScript, you won't need a lot of extra type definitions in your code. In fact, as you'll see in this tutorial, you'll get all the benefits of a fully typesafe codebase with code that looks almost like regular JavaScript.

Also, TypeScript can be gradually adopted. Meaning that you can use our TypeScript starter while adding JavaScript files to it. We don't recommend doing this, but that's always an option for you.

---

Alright, we are ready to create our new project!
