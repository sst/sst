---
title: Events
description: "Publish and handle events in your SST App."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Publish and handle events in your SST App

</HeadlineText>

---

## Overview

Sometimes you might want to return a request to the user right away but run some tasks asynchronously. For example, you might want to process an order but send a confirmation email later.

SST allows you publish and subscribe to various events that occur within your application.

- When your API gets invoked, emit an event
- Your API then returns right away
- A handler will be triggered asynchronously to process the event.

Let's look at it in detail.

---

#### Get started

Start by creating a new SST app by running the following command in your terminal.

```bash
npx create-sst@latest
```

---

## The event bus

Your app will already have an EventBus configured. This construct receives the events and routes them to the correct subscribers.

```ts title="stacks/MyStack.ts"
const bus = new EventBus(stack, "bus", {
  defaults: {
    retries: 10,
  },
});
```

:::info
This configuration will retry all subscriber errors up to 10 times (with exponential backoff). You can also configure this on a per susbcriber basis.
:::

The template also creates an `event.ts` which creates an `event` function that can be used to define events.

```ts title="/packages/core/src/event.ts"
import { createEventBuilder, ZodValidator } from "sst/node/event-bus";

export const event = createEventBuilder({
  bus: "bus",
  validator: ZodValidator
});
```

---
## Define events

In your application you can define events. This definition provides validation using zod as well as typesafety to subscribers. Here is a `todo.created` event.


```ts title="packages/core/src/todo.ts"
import { event } from "./event";

export const Events = {
  Created: event("todo.created", z.object({
    id: z.string(),
  })),
};
```
---

## Define subscriber

Subscribers receive events when they are published. The `evt` object in the call back will be properly typed.

#### Create the handler

```ts title="packages/functions/src/events/todo-created.ts"
import { EventHandler } from "sst/node/event-bus";
import { Todo } from "@my-sst-app/core/todo";

export const handler = EventHandler(Todo.Events.Created, async (evt) => {
  console.log("Todo created", evt);
});
```

#### Setup subscription
We're exploring ways of eliminating this step.

```ts title="stacks/MyStack.ts"
bus.subscribe("todo.created", {
  handler: "packages/functions/src/events/todo-created.handler",
});
```

---

## Publish event

You can now publish events and you should see your subscriber should trigger.

```ts title="packages/core/src/todo.ts"
export async function create() {
  const id = crypto.randomUUID();

  // write to database

  await Events.Created.publish({
    id,
  });
}
```
