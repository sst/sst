---
title: Monorepo Project Structure
description: "We explore an opinionated monorepo project structure for your SST apps."
---

import config from "../../config";

SST gives you the flexibility to configure your projects in many different ways. However, as projects grow large, there's a need to better organize them. In this document we cover an opinionated setup that uses TypeScript and [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/).

We have a <a href={`${config.github}/tree/master/examples/typescript-monorepo`}>starter repo</a> that we are using for reference. You can install it by running:

``` bash
yarn create serverless-stack --use-yarn --example typescript-monorepo
```

There are some decisions made in this repo that reflect certain tradeoffs. We've picked what we feel makes sense for most teams and documented our thought process.

## Why monorepo

CI - which is an important part of serverless - is a lot easier when all the code that needs to be built exists in the same repo. It avoids having to figure out how to resolve cross repository dependencies and versioning.

That said, we've structured the repo in a way where components can be extracted into their own repositories once the boundaries become more clear.

To do this we are using [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/), which allows us to place multiple packages in this repo without the overhead of managing `node_modules` in each one. Running `yarn` at the root will install all the dependencies across all sub-packages.

## Separate packages

Since we're using Yarn Workspaces, it can be tempting to split up your project into many sub-packages; one per domain, one per service, etc.

The reality is, there isn't much benefit to creating multiple packages. The one technical advantage is it allows having different versions of dependencies for different pieces of your system. While this is true, it's not a common situation.

When using TypeScript, creating discrete boundaries has additional costs:

1. You lose the ability to take advantage of features like TypeScript's renaming, to rename all references to a variable or function.
2. Packages need to be built before they can be imported, which means if working across multiple packages you'll need a complex TypeScript watcher setup.
3. More configuration to manage. You'll need a `tsconfig.json` per package to get things working exactly right.

However, it's still helpful to have discrete boundaries. In our setup, we emulate multiple packages without the costs through the use of TypeScript package aliases. Code in the `core` folder can be imported using `import { Foo } from @acme/core`. See <a href={`${config.github}/blob/master/examples/typescript-monorepo/backend/tsconfig.json`}><code>backend/tsconfig.json</code></a> to see how this works.

## Project structure

We've chosen to make two packages in the backend: `core` and `services`.

### `core`

This should contain all the business logic for your application. A developer on your team should be able to import this package and do everything that your application can do. It should **not contain** any specific interface information, like REST API details or GraphQL schemas. It should also **not depend** on any other code in this repo.

This roughly reflects [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design). For a Todo application, `core` might look like this:

```
/core
  /user
  /todo
  /notification
  index.ts
```

Each folder contains all the implementation details for the domain. And exports only what is expected to be public to other domains. The `index.ts` should then export the domains that are public to the rest of the application.

### `services`

This package is for services that will be deployed to AWS. These can be Lambda functions that power your API, triggers for your event bus rules, and the like. It should **not contain** any business logic on its own. It should import domains from `core` and only contain the minimal code necessary to call them and forward results back.

Here's an example of what this can look like.

```
/services
  /auth
    cognito_triggers.ts
  /api
    user.ts
    todo.ts
  /notification
    bus_triggers.ts
```

## TypeScript

Instead of specifying `tsconfig.json` details directly, we've added a dependency on `@tsconfig/node14` which includes common defaults for Node 14. Every `tsconfig.json` in the repo extends it.

The config located at <a href={`${config.github}/blob/master/examples/typescript-monorepo/backend/tsconfig.json`}><code>backend/tsconfig.json</code></a> includes the configuration for aliases to emulate separate packages. If you add additional packages or wish to change the structure you can do so by adding to the `"paths"` patterns.

Additionally, we use the `include` setting to narrow what is processed. This is helpful to make sure when typechecking your SST stack you're not also wasting time typechecking application code which will be checked later anyway.

## Testing

The `backend` folder contains minimal configuration to set up [Jest](https://jestjs.io/) which is a testing framework. The tests can be run using `yarn test` from inside the `backend` folder. Additionally, we are using `esbuild-runner` instead of `ts-jest` to compile the code, making it significantly faster.

## Scripts

Full-stack serverless means a lot of your resources are in the cloud. It can be helpful to have scripts to do things like insert data into the database or push items onto a queue.

We provide a scripts folder to create these scripts - they can import code directly from `@acme/core`. This is an example of why it's helpful to separate your business logic from your lambda code. It allows it to be used in scripting scenarios without having to try and trigger lambdas housing the business logic.

We take advantage of `esbuild-runner` to execute the TypeScript code directly. You can use the included yarn script to run a script like:

``` bash
yarn script ./scripts/example.ts
```
