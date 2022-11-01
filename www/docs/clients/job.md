---
description: "Overview of the `job` module."
---

Overview of the `job` client in the `@serverless-stack/node` package. This client helps with creating and running [Jobs](../constructs/Job.md) handler functions. You can [read more about it over on the job docs](../long-running-jobs.md).

```ts
import { ... } from "@serverless-stack/node/job"
```

The `job` client has the following exports. 

---

## JobTypes

A type interface you can extend to define the job payload types.

```ts
declare module "@serverless-stack/node/job" {
  export interface JobTypes {
    myJob: {
      num: number;
    };
  }
}
```

---

## Job

This module helps with accessing [`Job`](../constructs/Job.md) constructs.

```ts
import { Job } from "@serverless-stack/node/job";
```

### run

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

## JobHandler

The `JobHandler` provides a function that can be used to implement the job handler function.

```ts
import { JobHandler } from "@serverless-stack/node/job";

export const handler = JobHandler("myJob", async (payload) => {
  // payload is typesafe
  console.log(payload.num);
});
```