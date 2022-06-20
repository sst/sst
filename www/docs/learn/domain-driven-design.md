---
id: domain-driven-design
title: Domain Driven Design
description: "Domain Driven Design"
---

SST encourages following [Domain Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design) patterns and the starter template reflects that. The rough idea behind it is to keep a seperate layer that purely implements your business logic which is agnostic to any API specifics. In practice this looks like creating a collection of modules and functions in the `core` folder that implement all the capabilities of your system.

In the starter we provide a `core/article.ts` module which contains actions you can take that are related to the business concept of `Articles`. It exposes high level functions that handle the work of talking to the database, storing and retrieving them and allow for more complex functionality in the future - like publishing notifications to an EventBus.

The API and Lambda Function code is unaware of any of these details and simply calls into these modules to composes the logic together.

### Why

At first this pattern may feel a bit extraneous but it is key to creating a maintainable codebase that stays fun to work in for years to come. Here are some of the benefits

#### Code Reuse
At first you may only be interfacing with your system through an API. However as time goes on you'll have scripts, Lambda Functions, and other things that need to trigger certain business logic. It is helpful to have this `core` library that can be reused in any context.

#### Hide implementation details

It's simpler to think in terms of "business actions" than to think about the underlying implementation details. The API simply interacts with an Article module and is in no way coupled to the underlying datastore (which can change!)

#### Refactor Zones
By decoupling your API and your business logic you allow these to change independently. For example, if you realize that the `Articles` function would be better served using a different database, only code in that file needs to change. Anything dependant on it can remain unaware.

Another example is backwards compatibility in the API. You can make breaking changes in your `core` library and isolate backwards compatibility to your API. Allows teams to stay nimble while staying safe.