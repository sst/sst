---
title: Domain Driven Design
---

import config from "../../config";
import styles from "../video.module.css";

So we are ready to start working on our app. We'll be adding a simple comments feature to our Reddit clone. There are many ways of implementing this feature but with SST we want you to adopt a setup that'll scale as your app grows.

We strongly encourage following the [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design) (DDD) pattern. And the setup that `create sst` generates reflects that.

In this chapter we'll look at this pattern at a very high level.

---

## What is DDD

The basic idea behind DDD is to keep a separate layer that purely implements your business logic. This is agnostic to any API specifics. In practice, this looks like creating a collection of modules and functions in the `packages/core` directory that implements all the capabilities of your system.

:::info
The basic idea behind Domain Driven Design is to have a separate layer that holds your business logic.
:::

In the starter we provide a `core/src/article.ts` module which contains actions you can take that are related to the business concept of _Articles_. It exposes high level functions that handle the work of talking to the database, storing and retrieving them, and allows for more complex functionality in the future — like publishing notifications to an event bus.

The API and Lambda function code are unaware of these details and simply call into these modules to compose the logic together.

---

## Why use DDD

At first this pattern may feel a bit extraneous. But it's key to creating a maintainable codebase that stays fun to work in for years to come. Here are some of the benefits.

- **Code reuse**

  At first you may only be interfacing with your system through an API. However as time goes on you'll have scripts, Lambda functions, and other things that need to trigger certain business logic. It's helpful to have this `core` library that can be reused in any context.

- **Hide implementation details**

  It's simpler to think in terms of _"business actions"_, than to think about the underlying implementation details. The API simply interacts with an _Article_ module and is in no way coupled to the underlying datastore (which can change!).

- **Refactor zones**

  By decoupling your API and your business logic you allow these to change independently. For example, if you realize that the _Articles_ function would be better served using a different database, only the code in that file needs to change. Anything dependant on it can remain unaware.

  Another example is backwards compatibility in the API. You can make breaking changes in your `core` library and isolate backwards compatibility to your API. This allows teams to be nimble while staying safe.

There's a lot more to the Domain Driven Design pattern. But we want to make sure that you have a good idea of why our app is organized the way it is.

:::tip Learn more
We took a deeper look at Domain Driven Design over our <a href={ config.youtube }>YouTube Channel</a>.

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/MC_dS5G1jqw" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
:::

---

With DDD in mind, let's add to the core of our app and build the new comments feature.
