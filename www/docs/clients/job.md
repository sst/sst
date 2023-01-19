---
description: "Overview of the `job` module."
---

Overview of the `job` module in the `sst/node` package. This module helps with creating and running [Jobs](../constructs/Job.md) handler functions. You can [read more about it over on the job docs](../long-running-jobs.md).

```ts
import { ... } from "sst/node/job"
```

The `job` module has the following exports.

---

## Types

Types to help you define the shape of your function arguments.

---

### JobTypes

A type interface you can extend to define the job payload types.

```ts
declare module "sst/node/job" {
  export interface JobTypes {
    myJob: {
      num: number;
    };
  }
}
```

---

## Methods

Methods that you can call in this module.

---

### Job

This export helps with interacting with the [`Job`](../constructs/Job.md) constructs.

```ts
import { Job } from "sst/node/job";
```

#### run

Provides a function that can be used to invoke the job handler function.

```ts
await Job.myJob.run({
  // payload is typesafe
  payload: {
    num: 100,
  },
});
```

---

## Handlers

The handlers can wrap around your Lambda function handler.

---

### JobHandler

The `JobHandler` provides a function that can be used to implement the job handler function.

```ts
import { JobHandler } from "sst/node/job";

export const handler = JobHandler("myJob", async (payload) => {
  // payload is typesafe
  console.log(payload.num);
});
```
