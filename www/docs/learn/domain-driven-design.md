---
title: Domain Driven Design
---

Now that we have our local environment up and running, we are ready to start working on our app. We'll be adding a simple comments feature to our Reddit clone. There are many ways of structuring your code for a feature like this. But with SST we want you to adopt a setup that'll scale as your app gets more complicated.

We encourage following the [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design) pattern. And the starter that `create sst` generates  reflects that. In this chapter we'll look at this pattern at a very high level.

The basic idea behind is to keep a seperate layer that purely implements your business logic. This is agnostic to any API specifics. In practice, this looks like creating a collection of modules and functions in the `services/core` directory that implement all the capabilities of your system.

In the starter we provide a `core/article.ts` module which contains actions you can take that are related to the business concept of _Articles_. It exposes high level functions that handle the work of talking to the database, storing and retrieving them, and allows for more complex functionality in the future - like publishing notifications to an event bus.

The API and Lambda function code is unaware of any of these details and simply calls into these modules to compose the logic together.

### Why DDD

At first this pattern may feel a bit extraneous. But it's key to creating a maintainable codebase that stays fun to work in for years to come. Here are some of the benefits.

- **Code reuse**

  At first you may only be interfacing with your system through an API. However as time goes on you'll have scripts, Lambda functions, and other things that need to trigger certain business logic. It is helpful to have this `core` library that can be reused in any context.

- **Hide implementation details**

  It's simpler to think in terms of "business actions", than to think about the underlying implementation details. The API simply interacts with an _Article_ module and is in no way coupled to the underlying datastore (which can change!).

- **Refactor zones**

  By decoupling your API and your business logic you allow these to change independently. For example, if you realize that the _Articles_ function would be better served using a different database, only the code in that file needs to change. Anything dependant on it can remain unaware.

  Another example is backwards compatibility in the API. You can make breaking changes in your `core` library and isolate backwards compatibility to your API. The allows teams to stay nimble while staying safe.

There's a lot more to the Domain Driven Design pattern. But we want to make sure that you have a good idea of why our app is organized the way it is.

With that in mind, let's start adding to the core of our app to build the new comments feature.
