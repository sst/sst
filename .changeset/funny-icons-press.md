---
"sst": minor
---

There is a slight breaking change in this release if you are using SST Events with `createEventBuilder()` - you should receive type errors for all the issues. We now support specifying any validation library so will need to configure that.

To continue using Zod you can specify the validator like so

```
import { createEventBuilder, ZodValidator } from "sst/node/event-bus"
const event = createEventBuilder({
  bus: "MyBus",
  validator: ZodValidator
})
```

Additionally we no longer assume you are passing in a zod object as the schema.
You'll have to update code from:

```
const MyEvent = event("my.event", {
  foo: z.string(),
})
```

to this:

```
const MyEvent = event("my.event", z.object({
  foo: z.string(),
}))
```

This also allows you to specify non-objects as the event properties. Additionally, if you were using advanced inference the `shape` field has been replaced with `typeof MyEvent.$input`, `typeof MyEvent.$output`, and `typeof MyEvent.$metadata`
